import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/mileage/mileage-utils";

type Metrics = {
  ridersServed: number;
  ridesRequested: number;
  ridesCompleted: number;
  tripLegsCompleted: number;
  unmetRequests: number;
  cancellations: number;
  noShows: number;
  milesDriven: number;
  volunteerHours: number;
  activeDrivers: number;
  reimbursementTotalCents: number;
  recurringRideVolume: number;
};

export function ReportSummaryCards({ metrics }: Readonly<{ metrics: Metrics }>) {
  const cards = [
    ["Riders served", metrics.ridersServed],
    ["Rides requested", metrics.ridesRequested],
    ["Rides completed", metrics.ridesCompleted],
    ["Trip legs completed", metrics.tripLegsCompleted],
    ["Unmet requests", metrics.unmetRequests],
    ["Cancellations", metrics.cancellations],
    ["No-shows", metrics.noShows],
    ["Miles driven", metrics.milesDriven.toFixed(2)],
    ["Volunteer hours", metrics.volunteerHours.toFixed(2)],
    ["Active drivers", metrics.activeDrivers],
    ["Reimbursements", formatCurrency(metrics.reimbursementTotalCents)],
    ["Recurring rides", metrics.recurringRideVolume],
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value]) => (
        <Card key={label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
