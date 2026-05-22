import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RiderRow = {
  id: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  county: string | null;
  status: string;
  eligibilityConfirmed: boolean;
  _count: {
    rideRequests: number;
    incidents: number;
    documents: number;
  };
};

export function RidersTable({
  riders,
  statusLabels,
  countyLabels,
}: Readonly<{
  riders: RiderRow[];
  statusLabels: Map<string, string>;
  countyLabels: Map<string, string>;
}>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rider</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Eligibility</TableHead>
          <TableHead>Activity</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {riders.map((rider) => (
          <TableRow key={rider.id}>
            <TableCell>
              <div className="flex flex-col gap-1">
                <Link href={`/riders/${rider.id}`} className="font-medium hover:underline">
                  {rider.displayName}
                </Link>
                <span className="text-xs text-muted-foreground">{rider.phone ?? rider.email ?? "No contact"}</span>
              </div>
            </TableCell>
            <TableCell>{[rider.city, countyLabels.get(rider.county ?? "")].filter(Boolean).join(", ") || "Not set"}</TableCell>
            <TableCell>
              <Badge variant="secondary">{statusLabels.get(rider.status) ?? rider.status}</Badge>
            </TableCell>
            <TableCell>{rider.eligibilityConfirmed ? "Confirmed" : "Needs review"}</TableCell>
            <TableCell>
              {rider._count.rideRequests} rides - {rider._count.incidents} incidents - {rider._count.documents} docs
            </TableCell>
            <TableCell className="text-right">
              <Button asChild variant="outline" size="sm">
                <Link href={`/riders/${rider.id}/edit`}>Edit</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
