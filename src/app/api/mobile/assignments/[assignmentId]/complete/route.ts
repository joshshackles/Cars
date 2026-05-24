import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-api/auth";
import { completeMobileAssignment, parseLocationInput } from "@/lib/mobile-api/driver-service";
import { getErrorMessage, mobileError, mobileOk } from "@/lib/mobile-api/responses";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const context = await requireMobileUser(request);
    const { assignmentId } = await params;
    const body = (await request.json()) as { location?: unknown; routeUrl?: string | null };
    await completeMobileAssignment(context, assignmentId, parseLocationInput(body.location), body.routeUrl);
    return mobileOk({ assignmentId, status: "COMPLETED", tripStatus: "COMPLETED" });
  } catch (error) {
    return mobileError(getErrorMessage(error), 400);
  }
}
