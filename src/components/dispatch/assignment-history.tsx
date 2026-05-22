import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type History = {
  id: string;
  action: string;
  metadata: unknown;
  createdAt: Date;
  actorUser: { name: string } | null;
};

export function AssignmentHistory({
  historyByTrip,
}: Readonly<{
  historyByTrip: Record<string, History[]>;
}>) {
  const entries = Object.entries(historyByTrip).flatMap(([tripId, items]) =>
    items.map((item) => ({ tripId, ...item }))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignment history</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length > 0 ? (
          <div className="flex flex-col gap-2">
            {entries.map((entry) => (
              <div key={entry.id} className="rounded-md border p-3 text-sm">
                <div className="font-medium">{entry.action}</div>
                <div className="text-muted-foreground">
                  {entry.createdAt.toLocaleString()} by {entry.actorUser?.name ?? "System"}
                </div>
                <pre className="mt-2 max-h-24 overflow-auto rounded-md bg-muted p-2 text-xs">
                  {JSON.stringify(entry.metadata, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No assignment history for the current view.</p>
        )}
      </CardContent>
    </Card>
  );
}
