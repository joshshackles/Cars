import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-api/auth";
import { parseLocationInput, recordMobileLocation } from "@/lib/mobile-api/driver-service";
import { getErrorMessage, mobileError, mobileOk } from "@/lib/mobile-api/responses";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const context = await requireMobileUser(request);
    const { assignmentId } = await params;
    const body = (await request.json()) as { location?: unknown };
    const ping = await recordMobileLocation(context, assignmentId, parseLocationInput(body.location));
    return mobileOk({ assignmentId, ping });
  } catch (error) {
    return mobileError(getErrorMessage(error), 400);
  }
}
