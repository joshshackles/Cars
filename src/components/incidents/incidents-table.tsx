import { IncidentStatus } from "@prisma/client";
import { updateIncidentStatusAction } from "@/actions/incident-actions";
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

type IncidentRow = {
  id: string;
  summary: string;
  details: string | null;
  severity: string;
  status: string;
  occurredAt: Date;
  rider: { displayName: string } | null;
  driver: { displayName: string } | null;
};

export function IncidentsTable({ incidents }: Readonly<{ incidents: IncidentRow[] }>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Incident</TableHead>
          <TableHead>Linked records</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Occurred</TableHead>
          <TableHead className="text-right">Update</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {incidents.map((incident) => (
          <TableRow key={incident.id}>
            <TableCell>
              <div className="max-w-md">
                <p className="font-medium">{incident.summary}</p>
                {incident.details ? <p className="mt-1 text-xs text-muted-foreground">{incident.details}</p> : null}
              </div>
            </TableCell>
            <TableCell>
              <div className="text-sm">
                <p>{incident.rider?.displayName ?? "No rider"}</p>
                <p className="text-xs text-muted-foreground">{incident.driver?.displayName ?? "No driver"}</p>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={incident.severity === "HIGH" || incident.severity === "CRITICAL" ? "destructive" : "secondary"}>
                {formatLabel(incident.severity)}
              </Badge>
            </TableCell>
            <TableCell>{formatLabel(incident.status)}</TableCell>
            <TableCell>{incident.occurredAt.toLocaleDateString()}</TableCell>
            <TableCell className="text-right">
              <form action={updateIncidentStatusAction} className="flex justify-end gap-2">
                <input type="hidden" name="incidentId" value={incident.id} />
                <select name="status" defaultValue={incident.status} className="h-9 rounded-md border bg-background px-2 text-sm">
                  {Object.values(IncidentStatus).map((status) => (
                    <option key={status} value={status}>
                      {formatLabel(status)}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm" variant="outline">Save</Button>
              </form>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function formatLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}
