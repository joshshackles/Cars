import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-api/auth";
import { getMobileDriverTools, updateMobileDriverInfo } from "@/lib/mobile-api/driver-service";
import { getErrorMessage, mobileError, mobileOk } from "@/lib/mobile-api/responses";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const context = await requireMobileUser(request);
    return mobileOk(await getMobileDriverTools(context));
  } catch (error) {
    return mobileError(getErrorMessage(error), 400);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireMobileUser(request);
    const body = await request.json();
    return mobileOk(await updateMobileDriverInfo(context, body));
  } catch (error) {
    return mobileError(getErrorMessage(error), 400);
  }
}
