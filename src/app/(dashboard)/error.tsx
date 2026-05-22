"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-96 flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/30 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-md border bg-card text-muted-foreground">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {error.message || "The page could not load. Try again, or return to the previous workflow."}
        </p>
      </div>
      <Button type="button" onClick={reset}>Try again</Button>
    </div>
  );
}
