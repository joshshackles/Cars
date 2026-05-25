import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-api/auth";
import { getMobileProfile } from "@/lib/mobile-api/driver-service";
import { updateMobileProfile } from "@/lib/mobile-api/mobile-profile-service";
import { getErrorMessage, mobileError, mobileOk } from "@/lib/mobile-api/responses";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const context = await requireMobileUser(request);
    return mobileOk(await getMobileProfile(context));
  } catch (error) {
    return mobileError(getErrorMessage(error), 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireMobileUser(request);
    const body = await request.json();
    await updateMobileProfile(context, body);
    return mobileOk(await getMobileProfile(context));
  } catch (error) {
    return mobileError(getErrorMessage(error), 400);
  }
}
