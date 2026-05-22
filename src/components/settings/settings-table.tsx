import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SettingRow = {
  id: string;
  category: string;
  key: string;
  label: string;
  description: string | null;
  value: unknown;
  updatedAt: Date;
};

export function SettingsTable({ settings }: Readonly<{ settings: SettingRow[] }>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Setting</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {settings.map((setting) => (
          <TableRow key={setting.id}>
            <TableCell>
              <div className="flex flex-col gap-1">
                <span className="font-medium">{setting.label}</span>
                <span className="text-xs text-muted-foreground">{setting.key}</span>
                {setting.description ? (
                  <span className="text-xs text-muted-foreground">{setting.description}</span>
                ) : null}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{setting.category}</Badge>
            </TableCell>
            <TableCell>
              <pre className="max-h-32 max-w-xl overflow-auto rounded-md bg-muted p-3 text-xs leading-5">
                {JSON.stringify(setting.value, null, 2)}
              </pre>
            </TableCell>
            <TableCell>{setting.updatedAt.toLocaleDateString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
