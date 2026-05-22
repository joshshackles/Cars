import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/mileage/mileage-utils";

type BarRow = { label: string; value: number };
type DriverActivity = { driver: string; completedTrips: number; miles: number; hours: number; reimbursementCents: number };
type ReimbursementBatch = { batchNumber: string; driver: string; totalCents: number; totalMiles: number; status: string };

export function ReportCharts({
  countiesServed,
  ridePurposes,
  destinationTypes,
  fundingSourceTotals,
  driverActivity,
  reimbursementBatches,
}: Readonly<{
  countiesServed: BarRow[];
  ridePurposes: BarRow[];
  destinationTypes: BarRow[];
  fundingSourceTotals: BarRow[];
  driverActivity: DriverActivity[];
  reimbursementBatches: ReimbursementBatch[];
}>) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <BarChartCard title="Counties served" rows={countiesServed} />
      <BarChartCard title="Ride purposes" rows={ridePurposes} />
      <BarChartCard title="Destination types" rows={destinationTypes} />
      <BarChartCard title="Funding source totals" rows={fundingSourceTotals} formatValue={formatCurrency} />
      <DriverActivityTable rows={driverActivity} />
      <ReimbursementTable rows={reimbursementBatches} />
    </div>
  );
}

function BarChartCard({ title, rows, formatValue }: Readonly<{ title: string; rows: BarRow[]; formatValue?: (value: number) => string }>) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {rows.length > 0 ? rows.map((row) => (
          <div key={row.label} className="grid gap-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium">{row.label}</span>
              <span className="text-muted-foreground">{formatValue ? formatValue(row.value) : row.value}</span>
            </div>
            <div className="h-2 rounded-md bg-muted">
              <div className="h-2 rounded-md bg-primary" style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
            </div>
          </div>
        )) : (
          <p className="text-sm text-muted-foreground">No matching operational data for this report.</p>
        )}
      </CardContent>
    </Card>
  );
}

function DriverActivityTable({ rows }: Readonly<{ rows: DriverActivity[] }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Driver activity</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver</TableHead>
              <TableHead>Trips</TableHead>
              <TableHead>Miles</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Reimbursement</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? rows.map((row) => (
              <TableRow key={row.driver}>
                <TableCell className="font-medium">{row.driver}</TableCell>
                <TableCell>{row.completedTrips}</TableCell>
                <TableCell>{row.miles.toFixed(2)}</TableCell>
                <TableCell>{row.hours.toFixed(2)}</TableCell>
                <TableCell>{formatCurrency(row.reimbursementCents)}</TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={5} className="text-muted-foreground">No driver activity for this report.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ReimbursementTable({ rows }: Readonly<{ rows: ReimbursementBatch[] }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reimbursement totals</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Miles</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? rows.map((row) => (
              <TableRow key={row.batchNumber}>
                <TableCell className="font-medium">{row.batchNumber}</TableCell>
                <TableCell>{row.driver}</TableCell>
                <TableCell>{row.totalMiles.toFixed(2)}</TableCell>
                <TableCell>{formatCurrency(row.totalCents)}</TableCell>
                <TableCell><Badge variant="secondary">{row.status.toLowerCase()}</Badge></TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={5} className="text-muted-foreground">No reimbursement batches for this report.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
