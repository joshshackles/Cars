import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-api/auth";
import { markMobileArrived, parseLocationInput } from "@/lib/mobile-api/driver-service";
import { getErrorMessage, mobileError, mobileOk } from "@/lib/mobile-api/responses";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const context = await requireMobileUser(request);
    const { assignmentId } = await params;
    const body = (await request.json().catch(() => ({}))) as { location?: unknown };
    await markMobileArrived(context, assignmentId, body.location ? parseLocationInput(body.location) : undefined);
    return mobileOk({ assignmentId, tripStatus: "ARRIVED" });
  } catch (error) {
    return mobileError(getErrorMessage(error), 400);
  }
}
