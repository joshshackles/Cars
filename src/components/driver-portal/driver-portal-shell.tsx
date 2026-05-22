import type { ReactNode } from "react";
import { CarFront } from "lucide-react";

type DriverPortalShellProps = {
  driverName: string;
  children: ReactNode;
};

export function DriverPortalShell({ driverName, children }: DriverPortalShellProps) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/95 px-4 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-md bg-cyan-400 text-slate-950">
              <CarFront className="size-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-cyan-200">CARS Driver Portal</p>
              <h1 className="truncate text-xl font-semibold">{driverName}</h1>
            </div>
          </div>
        </header>
        <div className="flex-1 px-4 py-5">{children}</div>
      </div>
    </main>
  );
}
