import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-api/auth";
import { createMobileRideRequest } from "@/lib/mobile-api/mobile-profile-service";
import { getErrorMessage, mobileError, mobileOk } from "@/lib/mobile-api/responses";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const context = await requireMobileUser(request);
    const body = await request.json();
    return mobileOk(await createMobileRideRequest(context, body));
  } catch (error) {
    return mobileError(getErrorMessage(error), 400);
  }
}
