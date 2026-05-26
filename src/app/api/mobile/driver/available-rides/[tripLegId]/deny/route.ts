import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-api/auth";
import { denyAvailableRideRequest } from "@/lib/mobile-api/driver-service";
import { getErrorMessage, mobileError, mobileOk } from "@/lib/mobile-api/responses";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripLegId: string }> }
) {
  try {
    const context = await requireMobileUser(request);
    const { tripLegId } = await params;
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    return mobileOk(await denyAvailableRideRequest(context, tripLegId, body.reason));
  } catch (error) {
    return mobileError(getErrorMessage(error), 400);
  }
}
