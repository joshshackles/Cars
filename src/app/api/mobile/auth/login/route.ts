import { NextRequest } from "next/server";
import { createMobileSession } from "@/lib/mobile-api/auth";
import { getErrorMessage, mobileError, mobileOk } from "@/lib/mobile-api/responses";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; deviceName?: string; accessCode?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return mobileError("Email is required.", 400);
    }

    const session = await createMobileSession(email, body.deviceName, body.accessCode);

    return mobileOk(session);
  } catch (error) {
    return mobileError(getErrorMessage(error), 401);
  }
}
