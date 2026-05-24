import Image from "next/image";
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
      <Image
        src="/brand/cars-logo.png"
        alt="CARS Community Action Ride System"
        width={80}
        height={80}
        priority
        className="size-16 shrink-0 object-contain drop-shadow-md"
      />
      {!compact ? (
        <div className="cars-logo-text flex min-w-0 flex-col">
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
