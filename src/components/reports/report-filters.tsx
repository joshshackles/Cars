import { Button } from "@/components/ui/button";
import type { ReportFilters } from "@/lib/reports/report-utils";

type Option = { code: string; label: string };
type Driver = { id: string; displayName: string };
type FundingSource = { id: string; name: string };

export function ReportFiltersForm({
  filters,
  counties,
  ridePurposes,
  fundingSources,
  drivers,
  riderStatuses,
  destinationTypes,
}: Readonly<{
  filters: ReportFilters;
  counties: Option[];
  ridePurposes: Option[];
  fundingSources: FundingSource[];
  drivers: Driver[];
  riderStatuses: Option[];
  destinationTypes: Option[];
}>) {
  return (
    <form className="grid gap-3 rounded-lg border bg-card p-4 lg:grid-cols-4 xl:grid-cols-8">
      <input name="startDate" type="date" defaultValue={filters.startDate} className="h-10 rounded-md border bg-background px-3 text-sm" />
      <input name="endDate" type="date" defaultValue={filters.endDate} className="h-10 rounded-md border bg-background px-3 text-sm" />
      <OptionSelect name="county" value={filters.county} label="All counties" options={counties} />
      <OptionSelect name="ridePurpose" value={filters.ridePurpose} label="All purposes" options={ridePurposes} />
      <select name="fundingSourceId" defaultValue={filters.fundingSourceId ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm">
        <option value="">All funding</option>
        {fundingSources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
      </select>
      <select name="driverId" defaultValue={filters.driverId ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm">
        <option value="">All drivers</option>
        {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.displayName}</option>)}
      </select>
      <OptionSelect name="riderStatus" value={filters.riderStatus} label="All rider statuses" options={riderStatuses} />
      <OptionSelect name="destinationType" value={filters.destinationType} label="All destinations" options={destinationTypes} />
      <Button type="submit" className="xl:col-start-8">Apply</Button>
    </form>
  );
}

function OptionSelect({ name, value, label, options }: Readonly<{ name: string; value?: string; label: string; options: Option[] }>) {
  return (
    <select name={name} defaultValue={value ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm">
      <option value="">{label}</option>
      {options.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
    </select>
  );
}
