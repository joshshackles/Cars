import { createRiderAction, updateRiderAction } from "@/actions/rider-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SettingOption } from "@/types/settings";

type RiderFormValue = {
  id?: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  county?: string | null;
  state?: string | null;
  postalCode?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  communicationPreference?: string | null;
  mobilityNotes?: string | null;
  riderNotes?: string | null;
  sensitiveNotes?: string | null;
  eligibilityConfirmed?: boolean;
  intakeDate?: Date | null;
  pickupInstructions?: string | null;
  status?: string;
};

const communicationPreferences = [
  { code: "phone", label: "Phone" },
  { code: "sms", label: "SMS" },
  { code: "email", label: "Email" },
  { code: "mail", label: "Mail" },
];

export function RiderForm({
  rider,
  counties,
  statuses,
  canViewSensitiveNotes,
}: Readonly<{
  rider?: RiderFormValue;
  counties: SettingOption[];
  statuses: SettingOption[];
  canViewSensitiveNotes: boolean;
}>) {
  const action = rider?.id
    ? updateRiderAction.bind(null, rider.id)
    : createRiderAction;

  return (
    <form action={action} className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Rider details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="First name" name="firstName" defaultValue={rider?.firstName} required />
          <Field label="Last name" name="lastName" defaultValue={rider?.lastName} required />
          <Field label="Phone" name="phone" defaultValue={rider?.phone} />
          <Field label="Email" name="email" type="email" defaultValue={rider?.email} />
          <SelectField label="County" name="county" defaultValue={rider?.county} options={counties} required />
          <SelectField label="Status" name="status" defaultValue={rider?.status ?? "active"} options={statuses} required />
          <SelectField
            label="Communication preference"
            name="communicationPreference"
            defaultValue={rider?.communicationPreference ?? "phone"}
            options={communicationPreferences}
          />
          <Field
            label="Intake date"
            name="intakeDate"
            type="date"
            defaultValue={rider?.intakeDate ? rider.intakeDate.toISOString().slice(0, 10) : undefined}
          />
          <label className="flex items-center gap-2 text-sm font-medium md:col-span-2">
            <input
              type="checkbox"
              name="eligibilityConfirmed"
              defaultChecked={rider?.eligibilityConfirmed ?? false}
              className="size-4"
            />
            Eligibility confirmed
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address and contacts</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Address" name="addressLine1" defaultValue={rider?.addressLine1} />
          <Field label="Address line 2" name="addressLine2" defaultValue={rider?.addressLine2} />
          <Field label="City" name="city" defaultValue={rider?.city} />
          <Field label="State" name="state" defaultValue={rider?.state ?? "MO"} />
          <Field label="Postal code" name="postalCode" defaultValue={rider?.postalCode} />
          <Field label="Emergency contact" name="emergencyContactName" defaultValue={rider?.emergencyContactName} />
          <Field label="Emergency phone" name="emergencyContactPhone" defaultValue={rider?.emergencyContactPhone} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operational notes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <TextAreaField label="Mobility needs" name="mobilityNotes" defaultValue={rider?.mobilityNotes} />
          <TextAreaField label="Rider notes" name="riderNotes" defaultValue={rider?.riderNotes} />
          <TextAreaField label="Pickup instructions" name="pickupInstructions" defaultValue={rider?.pickupInstructions} />
          {canViewSensitiveNotes ? (
            <TextAreaField label="Sensitive notes" name="sensitiveNotes" defaultValue={rider?.sensitiveNotes} />
          ) : null}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit">{rider?.id ? "Save rider" : "Create rider"}</Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
}: Readonly<{
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  required?: boolean;
}>) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      {label}
      <Input name={name} type={type} defaultValue={defaultValue ?? ""} required={required} />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
  required,
}: Readonly<{
  label: string;
  name: string;
  defaultValue?: string | null;
  options: SettingOption[];
  required?: boolean;
}>) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      {label}
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="h-10 rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
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

function TextAreaField({
  label,
  name,
  defaultValue,
}: Readonly<{
  label: string;
  name: string;
  defaultValue?: string | null;
}>) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      {label}
      <Textarea name={name} defaultValue={defaultValue ?? ""} />
    </label>
  );
}
