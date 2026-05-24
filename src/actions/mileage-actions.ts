"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { requireAuthenticatedUser, requirePermission } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { calculateAmountCents, parseDateInput } from "@/lib/mileage/mileage-utils";

export async function approveMileageAction(mileageRecordId: string) {
  const context = await getFinanceContext("mileage:manage");
  const record = await getMileageRecord(context.organizationId, mileageRecordId);

  await db.mileageRecord.update({
    where: { id: record.id },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      updatedById: context.userId,
    },
  });

  await recordMileageStatus(context, record, "APPROVED", "Mileage approved.");
  await writeAudit(context, "mileage.approved", "MileageRecord", record.id, { oldStatus: record.status, newStatus: "APPROVED" }, record.id);
  revalidateFinance();
}

export async function rejectMileageAction(mileageRecordId: string, formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason) {
    throw new Error("A rejection reason is required.");
  }

  const context = await getFinanceContext("mileage:manage");
  const record = await getMileageRecord(context.organizationId, mileageRecordId);

  await db.mileageRecord.update({
    where: { id: record.id },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
      rejectionReason: reason,
      updatedById: context.userId,
    },
  });

  await recordMileageStatus(context, record, "REJECTED", reason);
  await writeAudit(context, "mileage.rejected", "MileageRecord", record.id, { oldStatus: record.status, newStatus: "REJECTED", reason }, record.id);
  revalidateFinance();
}

export async function adjustMileageAction(mileageRecordId: string, formData: FormData) {
  const adjustedMiles = Number(formData.get("miles"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!Number.isFinite(adjustedMiles) || adjustedMiles <= 0) {
    throw new Error("Adjusted miles must be greater than zero.");
  }

  if (!reason) {
    throw new Error("An adjustment reason is required.");
  }

  const context = await getFinanceContext("mileage:manage");
  const record = await getMileageRecord(context.organizationId, mileageRecordId);
  const amountCents = calculateAmountCents(adjustedMiles, record.rateCents);

  await db.mileageRecord.update({
    where: { id: record.id },
    data: {
      miles: adjustedMiles.toFixed(2),
      amountCents,
      adjustmentReason: reason,
      updatedById: context.userId,
    },
  });

  await writeAudit(context, "mileage.adjusted", "MileageRecord", record.id, {
    oldMiles: record.miles.toString(),
    newMiles: adjustedMiles.toFixed(2),
    oldAmountCents: record.amountCents,
    newAmountCents: amountCents,
    reason,
  }, record.id);
  revalidateFinance();
}

export async function createReimbursementBatchAction(formData: FormData) {
  const context = await getFinanceContext("reimbursements:manage");
  const driverId = String(formData.get("driverId") ?? "");
  const periodStart = parseDateInput(String(formData.get("periodStart") || ""), new Date());
  const periodEnd = parseDateInput(String(formData.get("periodEnd") || ""), new Date());

  if (!driverId) {
    throw new Error("Driver is required.");
  }

  if (periodEnd < periodStart) {
    throw new Error("Period end must be after period start.");
  }

  const records = await db.mileageRecord.findMany({
    where: {
      organizationId: context.organizationId,
      driverId,
      status: "APPROVED",
      reimbursementBatchId: null,
      deletedAt: null,
      serviceDate: {
        gte: periodStart,
        lte: endOfDay(periodEnd),
      },
    },
    orderBy: { serviceDate: "asc" },
  });

  if (records.length === 0) {
    throw new Error("No approved unbatched mileage exists for this driver and date range.");
  }

  const totalMiles = records.reduce((sum, record) => sum + Number(record.miles), 0);
  const totalCents = records.reduce((sum, record) => sum + record.amountCents, 0);
  const rateCents = records[0]?.rateCents ?? 0;
  const batchNumber = await nextBatchNumber(context.organizationId);

  const batch = await db.reimbursementBatch.create({
    data: {
      organizationId: context.organizationId,
      driverId,
      batchNumber,
      status: "APPROVED",
      periodStart,
      periodEnd,
      tripCount: records.length,
      rateCents,
      totalMiles: totalMiles.toFixed(2),
      totalCents,
      approvedAt: new Date(),
      paymentStatus: "pending",
      createdById: context.userId,
      updatedById: context.userId,
    },
  });

  await db.mileageRecord.updateMany({
    where: { id: { in: records.map((record) => record.id) } },
    data: {
      reimbursementBatchId: batch.id,
      status: "BATCHED",
      updatedById: context.userId,
    },
  });

  await Promise.all(
    records.map((record) =>
      recordMileageStatus(context, record, "BATCHED", `Added to reimbursement batch ${batch.batchNumber}.`, batch.id)
    )
  );

  await writeAudit(context, "reimbursement_batch.created", "ReimbursementBatch", batch.id, {
    batchNumber,
    driverId,
    tripCount: records.length,
    totalMiles: totalMiles.toFixed(2),
    totalCents,
  }, undefined, batch.id);
  revalidateFinance();
}

export async function markBatchPaidAction(batchId: string, formData: FormData) {
  const context = await getFinanceContext("reimbursements:manage");
  const paidAt = parseDateInput(String(formData.get("paidAt") || ""), new Date());
  const batch = await db.reimbursementBatch.findFirstOrThrow({
    where: { id: batchId, organizationId: context.organizationId, deletedAt: null },
    include: { mileageRecords: true },
  });

  await db.reimbursementBatch.update({
    where: { id: batch.id },
    data: {
      status: "PAID",
      paymentStatus: "paid",
      paidAt,
      updatedById: context.userId,
    },
  });

  await db.mileageRecord.updateMany({
    where: { reimbursementBatchId: batch.id },
    data: { status: "PAID", paidAt, updatedById: context.userId },
  });

  await writeAudit(context, "reimbursement_batch.paid", "ReimbursementBatch", batch.id, {
    batchNumber: batch.batchNumber,
    paidAt: paidAt.toISOString(),
  }, undefined, batch.id);
  revalidateFinance();
}

async function getFinanceContext(permission: "mileage:manage" | "reimbursements:manage") {
  const user = await requireAuthenticatedUser();
  const membership = await requirePermission(permission);
  return { userId: user.id, organizationId: membership.organizationId };
}

async function getMileageRecord(organizationId: string, mileageRecordId: string) {
  return db.mileageRecord.findFirstOrThrow({
    where: { id: mileageRecordId, organizationId, deletedAt: null },
  });
}

async function recordMileageStatus(
  context: { organizationId: string; userId: string },
  record: Awaited<ReturnType<typeof getMileageRecord>>,
  newStatus: string,
  note: string,
  reimbursementBatchId?: string
) {
  await db.statusHistory.create({
    data: {
      organizationId: context.organizationId,
      entityType: "MileageRecord",
      entityId: record.id,
      oldStatus: record.status,
      newStatus,
      changedById: context.userId,
      mileageRecordId: record.id,
      tripLegId: record.tripLegId,
      assignmentId: record.assignmentId,
      reimbursementBatchId,
      note,
    },
  });
}

async function writeAudit(
  context: { organizationId: string; userId: string },
  action: string,
  entityType: string,
  entityId: string,
  metadata: Prisma.InputJsonValue,
  mileageRecordId?: string,
  reimbursementBatchId?: string
) {
  await db.auditLog.create({
    data: {
      organizationId: context.organizationId,
      actorUserId: context.userId,
      action,
      entityType,
      entityId,
      mileageRecordId,
      reimbursementBatchId,
      metadata,
    },
  });
}

async function nextBatchNumber(organizationId: string) {
  const count = await db.reimbursementBatch.count({ where: { organizationId } });
  const date = new Date();
  return `RB-${date.getFullYear()}-${String(count + 1).padStart(4, "0")}`;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

function revalidateFinance() {
  revalidatePath("/mileage");
  revalidatePath("/mileage/pending");
  revalidatePath("/mileage/approved");
  revalidatePath("/mileage/rejected");
  revalidatePath("/mileage/drivers");
  revalidatePath("/reimbursements");
  revalidatePath("/reimbursements/batches");
}
