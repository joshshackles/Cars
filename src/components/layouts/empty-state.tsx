import { Inbox } from "lucide-react";
export function EmptyState({
  title,
  description,
}: Readonly<{
  title: string;
  description: string;
}>) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/30 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-md border bg-card text-muted-foreground">
        <Inbox className="size-5" aria-hidden="true" />
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
