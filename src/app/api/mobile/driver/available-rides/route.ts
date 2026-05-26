import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-api/auth";
import { getRideRequestsForDriverAvailability } from "@/lib/mobile-api/driver-service";
import { getErrorMessage, mobileError, mobileOk } from "@/lib/mobile-api/responses";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const context = await requireMobileUser(request);
    return mobileOk(await getRideRequestsForDriverAvailability(context));
  } catch (error) {
    return mobileError(getErrorMessage(error), 400);
  }
}
