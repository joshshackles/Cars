import { DriverPortalShell } from "@/components/driver-portal/driver-portal-shell";

export default function DriverPortalLoading() {
  return (
    <DriverPortalShell driverName="Loading">
      <div className="flex flex-col gap-4">
        <div className="h-8 w-56 animate-pulse rounded-md bg-white/15" />
        {[0, 1].map((item) => (
          <div key={item} className="flex flex-col gap-4 rounded-lg bg-white p-4">
            <div className="h-6 w-36 animate-pulse rounded-md bg-slate-200" />
            <div className="h-20 animate-pulse rounded-md bg-slate-100" />
            <div className="h-12 animate-pulse rounded-md bg-slate-200" />
          </div>
        ))}
      </div>
    </DriverPortalShell>
  );
}
