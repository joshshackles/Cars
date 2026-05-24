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
import {
  formatSettingCategory,
  getSettingObjectEntries,
  getSettingOptionPreview,
  groupSettingsByCategory,
  isSettingOptionArray,
  summarizeSettingValue,
} from "@/lib/settings/settings-presentation";

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
    <div className="flex flex-col gap-4">
      {groupSettingsByCategory(settings).map((group) => (
        <Card key={group.category}>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <CardTitle>{group.label}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {group.settings.length} setting{group.settings.length === 1 ? "" : "s"}
              </p>
            </div>
            <Badge variant="secondary">{group.category}</Badge>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setting</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.settings.map((setting) => (
                  <TableRow key={setting.id}>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{setting.label}</span>
                        <span className="text-xs text-muted-foreground">{setting.key}</span>
                        {setting.description ? (
                          <span className="max-w-md text-xs text-muted-foreground">
                            {setting.description}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <SettingValuePreview value={setting.value} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap align-top text-sm text-muted-foreground">
                      {setting.updatedAt.toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SettingValuePreview({ value }: Readonly<{ value: unknown }>) {
  const optionPreview = getSettingOptionPreview(value);
  const objectEntries = getSettingObjectEntries(value);
  const hasOptions = isSettingOptionArray(value);

  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="font-medium">{summarizeSettingValue(value)}</span>
        {hasOptions ? (
          <span className="text-xs text-muted-foreground">
            Inactive options remain stored for historical records.
          </span>
        ) : null}
      </div>

      {optionPreview.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {optionPreview.map((option) => (
            <Badge
              key={option.code}
              variant={option.active === false ? "outline" : "secondary"}
            >
              {option.label}
            </Badge>
          ))}
          {Array.isArray(value) && value.length > optionPreview.length ? (
            <Badge variant="outline">+{value.length - optionPreview.length} more</Badge>
          ) : null}
        </div>
      ) : null}

      {!hasOptions && objectEntries.length > 0 ? (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {objectEntries.map(([key, entryValue]) => (
            <div key={key} className="rounded-md bg-muted/50 p-2">
              <dt className="text-xs font-medium text-muted-foreground">
                {formatSettingCategory(key)}
              </dt>
              <dd className="mt-1 break-words">
                {typeof entryValue === "object"
                  ? summarizeSettingValue(entryValue)
                  : String(entryValue)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-cars-navy">View raw JSON</summary>
        <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-muted p-3 leading-5">
          {JSON.stringify(value, null, 2)}
        </pre>
      </details>
    </div>
  );
}
