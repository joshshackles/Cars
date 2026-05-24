import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SettingOption } from "@/types/settings";

export function RiderFilters({
  search,
  status,
  county,
  statuses,
  counties,
}: Readonly<{
  search?: string;
  status?: string;
  county?: string;
  statuses: SettingOption[];
  counties: SettingOption[];
}>) {
  return (
    <form className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1fr_180px_180px_auto]">
      <Input name="search" placeholder="Search riders" defaultValue={search ?? ""} />
      <select
        name="status"
        defaultValue={status ?? ""}
        className="h-10 rounded-md border bg-background px-3 text-sm"
      >
        <option value="">All statuses</option>
        {statuses.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        name="county"
        defaultValue={county ?? ""}
        className="h-10 rounded-md border bg-background px-3 text-sm"
      >
        <option value="">All counties</option>
        {counties.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
      <Button type="submit" variant="outline">
        Apply
      </Button>
    </form>
  );
}
