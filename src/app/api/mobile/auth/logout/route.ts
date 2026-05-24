import { NextRequest } from "next/server";
import { revokeMobileSession } from "@/lib/mobile-api/auth";
import { mobileOk } from "@/lib/mobile-api/responses";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  await revokeMobileSession(request);
  return mobileOk({ signedOut: true });
}
