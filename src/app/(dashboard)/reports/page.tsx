import Link from "next/link";
import { PageHeader } from "@/components/layouts/page-header";
import { ReportCharts } from "@/components/reports/report-charts";
import { ReportFiltersForm } from "@/components/reports/report-filters";
import { ReportSummaryCards } from "@/components/reports/report-summary-cards";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/guards";
import { getOperationalReport, getReportFilterOptions } from "@/lib/reports/report-queries";
import { getDefaultReportFilters, type ReportFilters } from "@/lib/reports/report-utils";

type ReportsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const membership = await requirePermission("reports:view");
  const params = (await searchParams) ?? {};
  const filters = getDefaultReportFilters(params);
  const [options, report] = await Promise.all([
    getReportFilterOptions(membership.organizationId),
    getOperationalReport(membership.organizationId, filters),
  ]);
  const exportHref = `/reports/export?${new URLSearchParams(cleanFilters(filters)).toString()}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description="Operational metrics generated from ride requests, trip legs, drivers, mileage, reimbursements, destinations, and funding records."
        actions={<Button asChild variant="outline" size="sm"><Link href={exportHref}>Export CSV</Link></Button>}
      />
      <ReportFiltersForm filters={filters} {...options} />
      <ReportSummaryCards metrics={report.metrics} />
      <ReportCharts {...report.charts} />
    </div>
  );
}

function cleanFilters(filters: ReportFilters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
}
