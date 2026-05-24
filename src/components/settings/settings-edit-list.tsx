import { updateProgramSettingAction } from "@/actions/settings-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  groupSettingsByCategory,
  summarizeSettingValue,
} from "@/lib/settings/settings-presentation";

type SettingRow = {
  id: string;
  category: string;
  key: string;
  label: string;
  description: string | null;
  value: unknown;
};

export function SettingsEditList({ settings }: Readonly<{ settings: SettingRow[] }>) {
  return (
    <div className="flex flex-col gap-6">
      {groupSettingsByCategory(settings).map((group) => (
        <section key={group.category} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-cars-navy">{group.label}</h2>
              <p className="text-sm text-muted-foreground">
                {group.settings.length} editable setting
                {group.settings.length === 1 ? "" : "s"}
              </p>
            </div>
            <Badge variant="secondary">{group.category}</Badge>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {group.settings.map((setting) => (
              <Card key={setting.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <CardTitle>{setting.label}</CardTitle>
                      <CardDescription>{setting.description ?? setting.key}</CardDescription>
                    </div>
                    <Badge variant="outline">{summarizeSettingValue(setting.value)}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <form action={updateProgramSettingAction} className="flex flex-col gap-3">
                    <input type="hidden" name="settingId" value={setting.id} />
                    <input type="hidden" name="key" value={setting.key} />
                    <label className="text-sm font-medium" htmlFor={`setting-${setting.id}`}>
                      JSON value
                    </label>
                    <Textarea
                      id={`setting-${setting.id}`}
                      name="value"
                      className="min-h-48 font-mono text-xs leading-5"
                      defaultValue={JSON.stringify(setting.value, null, 2)}
                      spellCheck={false}
                    />
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        Saves are schema-validated and written to the audit log.
                      </p>
                      <Button type="submit" size="sm">
                        Save setting
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
