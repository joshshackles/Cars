import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-api/auth";
import { acceptAvailableRideRequest } from "@/lib/mobile-api/driver-service";
import { getErrorMessage, mobileError, mobileOk } from "@/lib/mobile-api/responses";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripLegId: string }> }
) {
  try {
    const context = await requireMobileUser(request);
    const { tripLegId } = await params;
    return mobileOk(await acceptAvailableRideRequest(context, tripLegId));
  } catch (error) {
    return mobileError(getErrorMessage(error), 400);
  }
}
