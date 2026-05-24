import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-api/auth";
import { reportMobileIssue } from "@/lib/mobile-api/driver-service";
import { getErrorMessage, mobileError, mobileOk } from "@/lib/mobile-api/responses";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const context = await requireMobileUser(request);
    const { assignmentId } = await params;
    const body = (await request.json()) as { summary?: string; details?: string };
    await reportMobileIssue(context, assignmentId, body.summary?.trim() ?? "", body.details?.trim());
    return mobileOk({ assignmentId, tripStatus: "NEEDS_ATTENTION" });
  } catch (error) {
    return mobileError(getErrorMessage(error), 400);
  }
}
