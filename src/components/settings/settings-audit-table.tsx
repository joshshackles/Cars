import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { summarizeAuditMetadata } from "@/lib/settings/settings-presentation";

type AuditRow = {
  id: string;
  action: string;
  entityId: string;
  metadata: unknown;
  createdAt: Date;
  actorUser: {
    name: string;
    email: string;
  } | null;
};

export function SettingsAuditTable({ logs }: Readonly<{ logs: AuditRow[] }>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Metadata</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell>{log.createdAt.toLocaleString()}</TableCell>
            <TableCell>
              {log.actorUser ? (
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{log.actorUser.name}</span>
                  <span className="text-xs text-muted-foreground">{log.actorUser.email}</span>
                </div>
              ) : (
                "System"
              )}
            </TableCell>
            <TableCell>{log.action}</TableCell>
            <TableCell>
              <div className="flex max-w-xl flex-col gap-2">
                <span className="text-sm">{summarizeAuditMetadata(log.metadata)}</span>
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-medium text-cars-navy">
                    View raw metadata
                  </summary>
                  <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-muted p-3 leading-5">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </details>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
