"use client";

import { AlertTriangle } from "lucide-react";
import { DriverPortalShell } from "@/components/driver-portal/driver-portal-shell";
import { Button } from "@/components/ui/button";

export default function DriverPortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <DriverPortalShell driverName="Driver Portal">
      <div className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-lg bg-white p-6 text-center text-slate-950">
        <AlertTriangle className="size-10 text-amber-600" aria-hidden="true" />
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Portal could not load</h2>
          <p className="text-sm leading-6 text-slate-600">Try again, or contact dispatch if the problem continues.</p>
        </div>
        <Button type="button" onClick={reset}>Try again</Button>
      </div>
    </DriverPortalShell>
  );
}
