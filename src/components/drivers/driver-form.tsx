import { createDriverAction, updateDriverAction } from "@/actions/driver-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SettingOption } from "@/types/settings";

type DriverValue = {
  id?: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  countiesServed?: unknown;
  preferredRideTypes?: unknown;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleYear?: number | null;
  licenseVerificationDate?: Date | null;
  insuranceVerificationDate?: Date | null;
  backgroundCheckStatus?: string | null;
  onboardingStatus?: string | null;
  reimbursementPreference?: string | null;
  status?: string;
  driverNotes?: string | null;
};

export function DriverForm({
  driver,
  counties,
  rideTypes,
  statuses,
  onboardingStatuses,
  backgroundStatuses,
  reimbursementPreferences,
}: Readonly<{
  driver?: DriverValue;
  counties: SettingOption[];
  rideTypes: SettingOption[];
  statuses: SettingOption[];
  onboardingStatuses: SettingOption[];
  backgroundStatuses: SettingOption[];
  reimbursementPreferences: SettingOption[];
}>) {
  const action = driver?.id ? updateDriverAction.bind(null, driver.id) : createDriverAction;
  const driverCounties = asStringArray(driver?.countiesServed);
  const preferredRideTypes = asStringArray(driver?.preferredRideTypes);

  return (
    <form action={action} className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Driver details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="First name" name="firstName" defaultValue={driver?.firstName} required />
          <Field label="Last name" name="lastName" defaultValue={driver?.lastName} required />
          <Field label="Phone" name="phone" defaultValue={driver?.phone} />
          <Field label="Email" name="email" type="email" defaultValue={driver?.email} />
          <SelectField label="Status" name="status" defaultValue={driver?.status ?? "active"} options={statuses} required />
          <SelectField label="Onboarding status" name="onboardingStatus" defaultValue={driver?.onboardingStatus} options={onboardingStatuses} />
          <SelectField label="Background check" name="backgroundCheckStatus" defaultValue={driver?.backgroundCheckStatus} options={backgroundStatuses} />
          <SelectField label="Reimbursement preference" name="reimbursementPreference" defaultValue={driver?.reimbursementPreference} options={reimbursementPreferences} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address and service preferences</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Address" name="addressLine1" defaultValue={driver?.addressLine1} />
          <Field label="Address line 2" name="addressLine2" defaultValue={driver?.addressLine2} />
          <Field label="City" name="city" defaultValue={driver?.city} />
          <Field label="State" name="state" defaultValue={driver?.state ?? "MO"} />
          <Field label="Postal code" name="postalCode" defaultValue={driver?.postalCode} />
          <CheckboxGroup label="Counties served" name="countiesServed" options={counties} values={driverCounties} />
          <CheckboxGroup label="Preferred ride types" name="preferredRideTypes" options={rideTypes} values={preferredRideTypes} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle and verification</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Vehicle make" name="vehicleMake" defaultValue={driver?.vehicleMake} />
          <Field label="Vehicle model" name="vehicleModel" defaultValue={driver?.vehicleModel} />
          <Field label="Vehicle year" name="vehicleYear" type="number" defaultValue={driver?.vehicleYear?.toString()} />
          <Field label="License verification date" name="licenseVerificationDate" type="date" defaultValue={formatDate(driver?.licenseVerificationDate)} />
          <Field label="Insurance verification date" name="insuranceVerificationDate" type="date" defaultValue={formatDate(driver?.insuranceVerificationDate)} />
          <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
            Driver notes
            <Textarea name="driverNotes" defaultValue={driver?.driverNotes ?? ""} />
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit">{driver?.id ? "Save driver" : "Create driver"}</Button>
      </div>
    </form>
  );
}

function Field({ label, name, defaultValue, type = "text", required }: Readonly<{ label: string; name: string; defaultValue?: string | null; type?: string; required?: boolean }>) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      {label}
      <Input name={name} type={type} defaultValue={defaultValue ?? ""} required={required} />
    </label>
  );
}

function SelectField({ label, name, defaultValue, options, required }: Readonly<{ label: string; name: string; defaultValue?: string | null; options: SettingOption[]; required?: boolean }>) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      {label}
      <select name={name} defaultValue={defaultValue ?? ""} required={required} className="h-10 rounded-md border bg-background px-3 text-sm">
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.code} value={option.code}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function CheckboxGroup({ label, name, options, values }: Readonly<{ label: string; name: string; options: SettingOption[]; values: string[] }>) {
  return (
    <fieldset className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
      <legend>{label}</legend>
      <div className="grid gap-2 md:grid-cols-2">
        {options.map((option) => (
          <label key={option.code} className="flex items-center gap-2 rounded-md border p-2 font-normal">
            <input type="checkbox" name={name} value={option.code} defaultChecked={values.includes(option.code)} className="size-4" />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function formatDate(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : undefined;
}
