import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-api/auth";
import { acceptMobileAssignment } from "@/lib/mobile-api/driver-service";
import { getErrorMessage, mobileError, mobileOk } from "@/lib/mobile-api/responses";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const context = await requireMobileUser(request);
    const { assignmentId } = await params;
    await acceptMobileAssignment(context, assignmentId);
    return mobileOk({ assignmentId, status: "ACCEPTED" });
  } catch (error) {
    return mobileError(getErrorMessage(error), 400);
  }
}
