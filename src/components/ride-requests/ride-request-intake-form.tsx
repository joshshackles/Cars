import { createRideRequestIntakeAction } from "@/actions/ride-request-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SettingOption } from "@/types/settings";

type RiderOption = {
  id: string;
  displayName: string;
  phone: string | null;
  email: string | null;
};

type FundingSourceOption = {
  id: string;
  name: string;
};

export function RideRequestIntakeForm({
  riders,
  counties,
  ridePurposes,
  fundingSources,
}: Readonly<{
  riders: RiderOption[];
  counties: SettingOption[];
  ridePurposes: SettingOption[];
  fundingSources: FundingSourceOption[];
}>) {
  return (
    <form action={createRideRequestIntakeAction} className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Rider</CardTitle>
          <CardDescription>Select an existing rider or create a rider during intake.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Rider intake mode"
            name="riderMode"
            defaultValue="existing"
            options={[
              { code: "existing", label: "Existing rider" },
              { code: "create", label: "Create rider" },
            ]}
          />
          <label className="flex flex-col gap-2 text-sm font-medium">
            Existing rider
            <select name="riderId" className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Select rider</option>
              {riders.map((rider) => (
                <option key={rider.id} value={rider.id}>
                  {rider.displayName} - {rider.phone ?? rider.email ?? "no contact"}
                </option>
              ))}
            </select>
          </label>
          <Field label="New rider first name" name="firstName" />
          <Field label="New rider last name" name="lastName" />
          <Field label="New rider phone" name="phone" />
          <Field label="New rider email" name="email" type="email" />
          <SelectField label="New rider county" name="riderCounty" options={counties} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trip details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Appointment date/time" name="appointmentAt" type="datetime-local" required />
          <Field label="Pickup window start" name="pickupWindowStart" type="datetime-local" />
          <Field label="Pickup window end" name="pickupWindowEnd" type="datetime-local" />
          <Field label="Return pickup time" name="returnPickupAt" type="datetime-local" />
          <SelectField label="Ride purpose" name="ridePurpose" options={ridePurposes} required />
          <SelectField
            label="Request source"
            name="requestSource"
            options={[
              { code: "phone", label: "Phone" },
              { code: "email", label: "Email" },
              { code: "partner_referral", label: "Partner referral" },
              { code: "walk_in", label: "Walk-in" },
            ]}
            required
          />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input name="returnTripNeeded" type="checkbox" className="size-4" />
            Return trip needed
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input name="multipleStops" type="checkbox" className="size-4" />
            Multiple stops
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input name="recurringRide" type="checkbox" className="size-4" />
            Recurring ride
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Funding source
            <select name="fundingSourceId" className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Select funding source</option>
              {fundingSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      <LocationCard title="Pickup location" prefix="pickup" counties={counties} required />
      <LocationCard title="Destination" prefix="destination" counties={counties} required />
      <Card>
        <CardHeader>
          <CardTitle>Additional stops</CardTitle>
          <CardDescription>Optional stops create additional trip legs in sequence.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {[1, 2, 3].map((index) => (
            <div key={index} className="grid gap-3 rounded-md border p-3 md:grid-cols-4">
              <Field label={`Stop ${index} address`} name={`stop${index}Address`} />
              <Field label="City" name={`stop${index}City`} />
              <SelectField label="County" name={`stop${index}County`} options={counties} />
              <Field label="Postal code" name={`stop${index}PostalCode`} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Special instructions
            <Textarea name="specialInstructions" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Internal notes
            <Textarea name="internalNotes" />
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit">Create ride request</Button>
      </div>
    </form>
  );
}

function LocationCard({ title, prefix, counties, required }: Readonly<{ title: string; prefix: string; counties: SettingOption[]; required?: boolean }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Field label="Address" name={`${prefix}Address`} required={required} />
        <Field label="City" name={`${prefix}City`} required={required} />
        <SelectField label="County" name={`${prefix}County`} options={counties} required={required} />
        <Field label="State" name={`${prefix}State`} defaultValue="MO" />
        <Field label="Postal code" name={`${prefix}PostalCode`} />
      </CardContent>
    </Card>
  );
}

function Field({ label, name, defaultValue, type = "text", required }: Readonly<{ label: string; name: string; defaultValue?: string; type?: string; required?: boolean }>) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      {label}
      <Input name={name} type={type} defaultValue={defaultValue ?? ""} required={required} />
    </label>
  );
}

function SelectField({ label, name, defaultValue, options, required }: Readonly<{ label: string; name: string; defaultValue?: string; options: SettingOption[]; required?: boolean }>) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      {label}
      <select name={name} defaultValue={defaultValue ?? ""} required={required} className="h-10 rounded-md border bg-background px-3 text-sm">
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
