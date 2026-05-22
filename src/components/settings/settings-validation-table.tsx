import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SettingValidationIssue } from "@/types/settings";

export function SettingsValidationTable({
  issues,
}: Readonly<{
  issues: SettingValidationIssue[];
}>) {
  if (issues.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
        <p className="text-sm font-medium">All settings are valid.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Required organization settings are present and match their expected value shapes.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Setting</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Issue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {issues.map((issue) => (
          <TableRow key={`${issue.key}-${issue.message}`}>
            <TableCell>
              <div className="flex flex-col gap-1">
                <span className="font-medium">{issue.label}</span>
                <span className="text-xs text-muted-foreground">{issue.key}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="destructive">Invalid</Badge>
            </TableCell>
            <TableCell>{issue.message}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
