import { Button } from "@/components/ui/button";
import type { SettingOption } from "@/types/settings";

type Driver = { id: string; displayName: string };
type FundingSource = { id: string; name: string };

const tripStatuses = [
  "PENDING",
  "READY_TO_ASSIGN",
  "ASSIGNED",
  "DRIVER_CONFIRMED",
  "IN_PROGRESS",
  "EN_ROUTE",
  "ARRIVED",
  "COMPLETED",
  "CANCELED",
  "NO_SHOW",
  "NEEDS_ATTENTION",
];

export function DispatchFilters({
  date,
  county,
  driverId,
  status,
  ridePurpose,
  fundingSourceId,
  counties,
  drivers,
  ridePurposes,
  fundingSources,
  weekly,
}: Readonly<{
  date: string;
  county?: string;
  driverId?: string;
  status?: string;
  ridePurpose?: string;
  fundingSourceId?: string;
  counties: SettingOption[];
  drivers: Driver[];
  ridePurposes: SettingOption[];
  fundingSources: FundingSource[];
  weekly?: boolean;
}>) {
  return (
    <form className="grid gap-3 rounded-lg border bg-card p-4 lg:grid-cols-[160px_repeat(5,1fr)_auto]">
      <input name="date" type="date" defaultValue={date} className="h-10 rounded-md border bg-background px-3 text-sm" />
      <Select name="county" value={county} label="All counties" options={counties} />
      <select name="driverId" defaultValue={driverId ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm">
        <option value="">All drivers</option>
        {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.displayName}</option>)}
      </select>
      <select name="status" defaultValue={status ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm">
        <option value="">All statuses</option>
        {tripStatuses.map((item) => <option key={item} value={item}>{item.toLowerCase()}</option>)}
      </select>
      <Select name="ridePurpose" value={ridePurpose} label="All purposes" options={ridePurposes} />
      <select name="fundingSourceId" defaultValue={fundingSourceId ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm">
        <option value="">All funding</option>
        {fundingSources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
      </select>
      <Button type="submit" variant="outline">{weekly ? "Filter week" : "Filter day"}</Button>
    </form>
  );
}

function Select({ name, value, label, options }: Readonly<{ name: string; value?: string; label: string; options: SettingOption[] }>) {
  return (
    <select name={name} defaultValue={value ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm">
      <option value="">{label}</option>
      {options.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
    </select>
  );
}
