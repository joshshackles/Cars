"use client";

import { useMemo, useState } from "react";
import { Archive, CheckCircle2, Plus, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type OptionValue = {
  code: string;
  label: string;
  active?: boolean;
  channel?: string;
  body?: string;
};

type EditableOption = OptionValue & {
  localId: string;
};

type SettingOptionEditorProps = {
  name: string;
  value: OptionValue[];
};

export function SettingOptionEditor({ name, value }: Readonly<SettingOptionEditorProps>) {
  const [options, setOptions] = useState<EditableOption[]>(() =>
    value.map((option, index) => ({
      ...option,
      active: option.active !== false,
      localId: `${option.code}-${index}`,
    }))
  );

  const serializedValue = useMemo(
    () =>
      JSON.stringify(
        options.map(({ localId, ...option }) => ({
          ...option,
          code: option.code.trim(),
          label: option.label.trim(),
          channel: option.channel?.trim(),
          body: option.body?.trim(),
          active: option.active !== false,
        })),
        null,
        2
      ),
    [options]
  );

  const activeCount = options.filter((option) => option.active !== false).length;
  const inactiveCount = options.length - activeCount;
  const hasTemplateFields = options.some(
    (option) => option.channel !== undefined || option.body !== undefined
  );

  function updateOption(localId: string, updates: Partial<OptionValue>) {
    setOptions((current) =>
      current.map((option) => (option.localId === localId ? { ...option, ...updates } : option))
    );
  }

  function addOption() {
    const nextNumber = options.length + 1;
    setOptions((current) => [
      ...current,
      {
        localId: `new-${Date.now()}`,
        code: `new-option-${nextNumber}`,
        label: "New option",
        active: true,
        ...(hasTemplateFields
          ? {
              channel: "sms",
              body: "Message template",
            }
          : {}),
      },
    ]);
  }

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name={name} value={serializedValue} readOnly />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{activeCount} active</Badge>
          <Badge variant="outline">{inactiveCount} inactive</Badge>
          <Badge variant="outline">{options.length} total</Badge>
        </div>
        <Button type="button" size="sm" onClick={addOption}>
          <Plus />
          Add option
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const isActive = option.active !== false;

          return (
            <div
              key={option.localId}
              className="grid gap-3 rounded-md border bg-white p-3 md:grid-cols-[1fr_1fr_auto]"
            >
              <label className="flex flex-col gap-1 text-sm font-medium">
                Label
                <Input
                  value={option.label}
                  onChange={(event) =>
                    updateOption(option.localId, { label: event.target.value })
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Code
                <Input
                  value={option.code}
                  onChange={(event) => updateOption(option.localId, { code: event.target.value })}
                />
              </label>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant={isActive ? "outline" : "secondary"}
                  className="w-full md:w-auto"
                  onClick={() => updateOption(option.localId, { active: !isActive })}
                >
                  {isActive ? <Archive /> : <RotateCcw />}
                  {isActive ? "Set inactive" : "Reactivate"}
                </Button>
              </div>

              {hasTemplateFields ? (
                <>
                  <label className="flex flex-col gap-1 text-sm font-medium md:col-span-1">
                    Channel
                    <Input
                      value={option.channel ?? ""}
                      onChange={(event) =>
                        updateOption(option.localId, { channel: event.target.value })
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium md:col-span-2">
                    Message body
                    <Textarea
                      className="min-h-24"
                      value={option.body ?? ""}
                      onChange={(event) =>
                        updateOption(option.localId, { body: event.target.value })
                      }
                    />
                  </label>
                </>
              ) : null}

              <div className="md:col-span-3">
                <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <CheckCircle2 className={isActive ? "size-4 text-emerald-600" : "size-4"} />
                  {isActive ? "Visible in forms" : "Stored for history, hidden from forms"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-cars-navy">
          Advanced: generated JSON
        </summary>
        <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-muted p-3 leading-5">
          {serializedValue}
        </pre>
      </details>
    </div>
  );
}
