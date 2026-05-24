import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-api/auth";
import { getMobileManifest } from "@/lib/mobile-api/driver-service";
import { getErrorMessage, mobileError, mobileOk } from "@/lib/mobile-api/responses";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const context = await requireMobileUser(request);
    const dateParam = request.nextUrl.searchParams.get("date");
    const date = dateParam ? new Date(`${dateParam}T00:00:00`) : undefined;

    if (dateParam && Number.isNaN(date?.getTime())) {
      return mobileError("Date must be in YYYY-MM-DD format.", 400);
    }

    return mobileOk(await getMobileManifest(context, date));
  } catch (error) {
    return mobileError(getErrorMessage(error), 401);
  }
}
