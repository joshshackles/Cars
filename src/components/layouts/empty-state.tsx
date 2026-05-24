import { CarFront } from "lucide-react";
export function EmptyState({
  title,
  description,
}: Readonly<{
  title: string;
  description: string;
}>) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-cars-navy text-white shadow-md">
        <CarFront className="size-10" aria-hidden="true" />
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-xl font-black text-cars-navy">{title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
