import Link from "next/link";
import { CheckCircle2, Eye, Pencil, Plus, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatSettingCategory,
  getSettingObjectEntries,
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
    <div className="flex flex-col gap-5">
      {groupSettingsByCategory(settings).map((group) => (
        <Card key={group.category} className="overflow-hidden">
          <CardHeader className="border-b bg-white/70">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <CardTitle>{group.label}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {group.settings.length} setting{group.settings.length === 1 ? "" : "s"} in this
                  setup area
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{group.category}</Badge>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/settings/edit#category-${group.category}`}>
                    <SlidersHorizontal />
                    Manage group
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {group.settings.map((setting) => (
                <SettingManagementRow key={setting.id} setting={setting} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SettingManagementRow({ setting }: Readonly<{ setting: SettingRow }>) {
  const isOptions = isSettingOptionArray(setting.value);

  return (
    <div
      id={`setting-${setting.key}`}
      className="grid gap-5 p-5 lg:grid-cols-[minmax(16rem,0.85fr)_minmax(0,1.35fr)_auto]"
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-cars-navy">{setting.label}</h3>
          {isOptions ? <Badge variant="outline">Option list</Badge> : null}
        </div>
        <span className="text-xs font-medium text-muted-foreground">{setting.key}</span>
        {setting.description ? (
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">{setting.description}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Updated {setting.updatedAt.toLocaleDateString()}
        </p>
      </div>

      <SettingValuePreview value={setting.value} />

      <div className="flex flex-row flex-wrap items-start gap-2 lg:flex-col lg:items-stretch">
        <Button asChild size="sm" className="min-w-32">
          <Link href={`/settings/edit#setting-${setting.key}`}>
            {isOptions ? <Plus /> : <Pencil />}
            {isOptions ? "Add or edit" : "Edit"}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="min-w-32">
          <Link href="/settings/validate">
            <CheckCircle2 />
            Validate
          </Link>
        </Button>
      </div>
    </div>
  );
}

function SettingValuePreview({ value }: Readonly<{ value: unknown }>) {
  const objectEntries = getSettingObjectEntries(value);
  const hasOptions = isSettingOptionArray(value);

  if (hasOptions) {
    return <SettingOptionsPreview options={value} />;
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{summarizeSettingValue(value)}</Badge>
      </div>

      {objectEntries.length > 0 ? (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {objectEntries.map(([key, entryValue]) => (
            <div key={key} className="rounded-md border bg-muted/40 p-3">
              <dt className="text-xs font-medium text-muted-foreground">
                {formatSettingCategory(key)}
              </dt>
              <dd className="mt-1 break-words font-medium text-cars-navy">
                {typeof entryValue === "object"
                  ? summarizeSettingValue(entryValue)
                  : String(entryValue)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <RawJsonDetails value={value} />
    </div>
  );
}

function SettingOptionsPreview({
  options,
}: Readonly<{
  options: Array<{ code: string; label: string; active?: boolean; channel?: string }>;
}>) {
  const activeOptions = options.filter((option) => option.active !== false);
  const inactiveOptions = options.filter((option) => option.active === false);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-md border bg-white p-3">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            Active
          </span>
          <p className="mt-1 text-2xl font-bold text-cars-navy">{activeOptions.length}</p>
        </div>
        <div className="rounded-md border bg-white p-3">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            Inactive
          </span>
          <p className="mt-1 text-2xl font-bold text-muted-foreground">
            {inactiveOptions.length}
          </p>
        </div>
        <div className="rounded-md border bg-white p-3">
          <span className="text-xs font-medium uppercase text-muted-foreground">
            Total
          </span>
          <p className="mt-1 text-2xl font-bold text-cars-red">{options.length}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-cars-navy">
          <Eye className="size-4" />
          Active types
        </div>
        {activeOptions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activeOptions.map((option) => (
              <Badge key={option.code} variant="secondary" className="gap-1">
                {option.label}
                {option.channel ? (
                  <span className="text-[10px] uppercase text-muted-foreground">
                    {option.channel}
                  </span>
                ) : null}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No active options. Add or reactivate one before this setting appears in forms.
          </p>
        )}
      </div>

      {inactiveOptions.length > 0 ? (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer font-medium text-cars-navy">
            Show {inactiveOptions.length} inactive option
            {inactiveOptions.length === 1 ? "" : "s"}
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {inactiveOptions.map((option) => (
              <Badge key={option.code} variant="outline">
                {option.label}
              </Badge>
            ))}
          </div>
        </details>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Inactive options stay available for historical records, but forms only offer active values.
      </p>
      <RawJsonDetails value={options} />
    </div>
  );
}

function RawJsonDetails({ value }: Readonly<{ value: unknown }>) {
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer font-medium text-cars-navy">Advanced: raw JSON</summary>
      <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-muted p-3 leading-5">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}
