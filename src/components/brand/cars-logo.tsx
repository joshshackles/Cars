import { CarFront } from "lucide-react";
import { cn } from "@/lib/utils";

export function CarsLogo({
  compact = false,
  className,
}: Readonly<{
  compact?: boolean;
  className?: string;
}>) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex size-16 shrink-0 items-center justify-center rounded-full border-4 border-white bg-white shadow-md ring-2 ring-cars-red">
        <div className="flex size-12 flex-col items-center justify-center rounded-full border border-cars-navy bg-cars-navy text-white">
          <CarFront className="size-6" aria-hidden="true" />
          <span className="mt-0.5 text-[10px] font-black leading-none tracking-widest text-cars-red">CARS</span>
        </div>
      </div>
      {!compact ? (
        <div className="flex min-w-0 flex-col">
          <div className="flex items-baseline gap-1.5 leading-none">
            <span className="text-2xl font-black tracking-tight text-cars-red">CARS</span>
            <span className="text-2xl font-black tracking-tight text-white">DISPATCH</span>
          </div>
          <span className="mt-1 text-xs font-semibold uppercase tracking-[0.32em] text-white/85">
            Volunteer Operations
          </span>
        </div>
      ) : null}
    </div>
  );
}
