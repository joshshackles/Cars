import { NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-api/auth";
import { removeMobileDriverAvailability } from "@/lib/mobile-api/driver-service";
import { getErrorMessage, mobileError, mobileOk } from "@/lib/mobile-api/responses";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ availabilityId: string }> }
) {
  try {
    const context = await requireMobileUser(request);
    const { availabilityId } = await params;
    return mobileOk(await removeMobileDriverAvailability(context, availabilityId));
  } catch (error) {
    return mobileError(getErrorMessage(error), 400);
  }
}
