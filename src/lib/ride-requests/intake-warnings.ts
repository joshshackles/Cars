import type { RideRequestIntakeInput } from "@/schemas/ride-request-schema";
import type { SettingOption } from "@/types/settings";

export type IntakeWarning = {
  code: "short_notice" | "out_of_county" | "missing_contact_info" | "incomplete_destination";
  message: string;
};

export function buildIntakeWarnings({
  input,
  countiesServed,
  riderContact,
  minimumNoticeDays,
}: {
  input: RideRequestIntakeInput;
  countiesServed: SettingOption[];
  riderContact: { phone?: string | null; email?: string | null };
  minimumNoticeDays: number;
}): IntakeWarning[] {
  const warnings: IntakeWarning[] = [];
  const now = new Date();
  const minimumTime = new Date(now);
  minimumTime.setDate(minimumTime.getDate() + minimumNoticeDays);
  const servedCountyCodes = new Set(countiesServed.map((county) => county.code));

  if (input.appointmentAt < minimumTime) {
    warnings.push({
      code: "short_notice",
      message: `Ride is inside the ${minimumNoticeDays}-day minimum scheduling notice.`,
    });
  }

  const counties = [input.pickup.county, input.destination.county, ...input.stops.map((stop) => stop.county)].filter(Boolean);
  if (counties.some((county) => !servedCountyCodes.has(county))) {
    warnings.push({
      code: "out_of_county",
      message: "One or more ride locations are outside the configured counties served.",
    });
  }

  if (!riderContact.phone && !riderContact.email) {
    warnings.push({
      code: "missing_contact_info",
      message: "The rider is missing phone and email contact information.",
    });
  }

  const locations = [input.pickup, input.destination, ...input.stops];
  if (locations.some((location) => !location.address || !location.city || !location.county)) {
    warnings.push({
      code: "incomplete_destination",
      message: "One or more pickup, destination, or stop locations are incomplete.",
    });
  }

  return warnings;
}
