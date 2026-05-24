import { Button } from "@/components/ui/button";
import type { SettingOption } from "@/types/settings";

export function DriverFilters({ activeOnly, county, onboardingStatus, expiredDocuments, counties, onboardingStatuses }: Readonly<{ activeOnly?: string; county?: string; onboardingStatus?: string; expiredDocuments?: string; counties: SettingOption[]; onboardingStatuses: SettingOption[] }>) {
  return (
    <form className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[150px_180px_220px_180px_auto]">
      <select name="activeOnly" defaultValue={activeOnly ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm">
        <option value="">All drivers</option>
        <option value="true">Active only</option>
      </select>
      <select name="county" defaultValue={county ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm">
        <option value="">All counties</option>
        {counties.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
      </select>
      <select name="onboardingStatus" defaultValue={onboardingStatus ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm">
        <option value="">All onboarding</option>
        {onboardingStatuses.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
      </select>
      <select name="expiredDocuments" defaultValue={expiredDocuments ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm">
        <option value="">All documents</option>
        <option value="true">Expired documents</option>
      </select>
      <Button type="submit" variant="outline">Apply</Button>
    </form>
  );
}
