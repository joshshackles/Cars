export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function formatMiles(value: unknown) {
  const numberValue = Number(value ?? 0);
  return numberValue.toFixed(2);
}

export function calculateAmountCents(miles: number, rateCents: number) {
  return Math.round(miles * rateCents);
}

export function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: unknown[][]) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function dateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function parseDateInput(value: string | undefined, fallback: Date) {
  if (!value) {
    return fallback;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? fallback : date;
}
