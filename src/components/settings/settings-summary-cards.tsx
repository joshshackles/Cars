import { AlertCircle, CheckCircle2, Clock, Layers3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getLatestSettingUpdate,
  getValidationStatus,
  groupSettingsByCategory,
} from "@/lib/settings/settings-presentation";
import type { SettingValidationIssue } from "@/types/settings";

type SettingRow = {
  id: string;
  category: string;
  key: string;
  label: string;
  description: string | null;
  value: unknown;
  updatedAt: Date;
};

export function SettingsSummaryCards({
  settings,
  issues,
}: Readonly<{
  settings: SettingRow[];
  issues: SettingValidationIssue[];
}>) {
  const latestUpdate = getLatestSettingUpdate(settings);
  const categoryCount = groupSettingsByCategory(settings).length;
  const validationLabel = getValidationStatus(issues);
  const isValid = issues.length === 0;

  const cards = [
    {
      label: "Settings",
      value: settings.length.toString(),
      detail: "Organization-scoped records",
      icon: Layers3,
    },
    {
      label: "Categories",
      value: categoryCount.toString(),
      detail: "Grouped configuration areas",
      icon: Layers3,
    },
    {
      label: "Validation",
      value: validationLabel,
      detail: isValid ? "Ready for forms and workflows" : "Review required before intake",
      icon: isValid ? CheckCircle2 : AlertCircle,
    },
    {
      label: "Last updated",
      value: latestUpdate ? latestUpdate.toLocaleDateString() : "None",
      detail: latestUpdate ? latestUpdate.toLocaleTimeString() : "No setting updates yet",
      icon: Clock,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-sm text-muted-foreground">{card.label}</CardTitle>
              <p className="text-2xl font-semibold text-cars-navy">{card.value}</p>
            </div>
            <div className="rounded-md bg-secondary p-2 text-cars-navy">
              <card.icon className="size-5" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{card.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
