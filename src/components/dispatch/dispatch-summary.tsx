import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DispatchSummary({
  summary,
}: Readonly<{
  summary: Record<string, number>;
}>) {
  const items = [
    ["Today trips", summary.today],
    ["Unassigned", summary.unassigned],
    ["Assigned", summary.assigned],
    ["Confirmed", summary.confirmed],
    ["Completed", summary.completed],
    ["Canceled", summary.canceled],
    ["No-shows", summary.noShows],
    ["Urgent exceptions", summary.urgentExceptions],
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map(([label, value]) => (
        <Card key={label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
