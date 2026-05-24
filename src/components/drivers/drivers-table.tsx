import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type DriverRow = {
  id: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  status: string;
  onboardingStatus: string | null;
  countiesServed: unknown;
  vehicleLabel: string | null;
  insuranceVerificationDate: Date | null;
  licenseVerificationDate: Date | null;
  _count: { assignments: number; mileageRecords: number; incidents: number; documents: number };
};

export function DriversTable({ drivers, statusLabels, countyLabels, onboardingLabels }: Readonly<{ drivers: DriverRow[]; statusLabels: Map<string, string>; countyLabels: Map<string, string>; onboardingLabels: Map<string, string> }>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Driver</TableHead>
          <TableHead>Counties</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Vehicle</TableHead>
          <TableHead>Documents</TableHead>
          <TableHead>Activity</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {drivers.map((driver) => (
          <TableRow key={driver.id}>
            <TableCell>
              <div className="flex flex-col gap-1">
                <Link href={`/drivers/${driver.id}`} className="font-medium hover:underline">{driver.displayName}</Link>
                <span className="text-xs text-muted-foreground">{driver.phone ?? driver.email ?? "No contact"}</span>
              </div>
            </TableCell>
            <TableCell>{asStringArray(driver.countiesServed).map((code) => countyLabels.get(code) ?? code).join(", ") || "Not set"}</TableCell>
            <TableCell className="flex flex-col gap-1">
              <Badge variant="secondary">{statusLabels.get(driver.status) ?? driver.status}</Badge>
              <span className="text-xs text-muted-foreground">{onboardingLabels.get(driver.onboardingStatus ?? "") ?? driver.onboardingStatus ?? "No onboarding status"}</span>
            </TableCell>
            <TableCell>{driver.vehicleLabel ?? "Not set"}</TableCell>
            <TableCell>{documentSummary(driver)}</TableCell>
            <TableCell>{driver._count.assignments} trips - {driver._count.mileageRecords} mileage - {driver._count.incidents} incidents</TableCell>
            <TableCell className="text-right">
              <Button asChild variant="outline" size="sm"><Link href={`/drivers/${driver.id}/edit`}>Edit</Link></Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function documentSummary(driver: DriverRow) {
  const now = new Date();
  const expired = [driver.licenseVerificationDate, driver.insuranceVerificationDate].some((date) => date && date < now);
  return expired ? "Expired review" : "Current";
}
