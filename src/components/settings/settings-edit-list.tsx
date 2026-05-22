import { updateProgramSettingAction } from "@/actions/settings-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type SettingRow = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  value: unknown;
};

export function SettingsEditList({ settings }: Readonly<{ settings: SettingRow[] }>) {
  return (
    <div className="grid gap-4">
      {settings.map((setting) => (
        <Card key={setting.id}>
          <CardHeader>
            <CardTitle>{setting.label}</CardTitle>
            <CardDescription>{setting.description ?? setting.key}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateProgramSettingAction} className="flex flex-col gap-3">
              <input type="hidden" name="settingId" value={setting.id} />
              <input type="hidden" name="key" value={setting.key} />
              <Textarea
                name="value"
                defaultValue={JSON.stringify(setting.value, null, 2)}
                spellCheck={false}
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm">
                  Save setting
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
