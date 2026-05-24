import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <CardTitle>All settings are valid</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Required organization settings are present and match the value shapes used by
            intake, dispatch, driver, finance, and reporting forms.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>{issues.length} setting issue{issues.length === 1 ? "" : "s"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Fix these before relying on settings-driven forms. Missing or malformed settings
            can block intake, dispatch assignment, mileage, and reporting workflows.
          </p>
        </CardContent>
      </Card>
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
    </div>
  );
}
