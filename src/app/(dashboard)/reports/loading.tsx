import { PageHeaderSkeleton } from "@/components/layouts/page-header-skeleton";

export default function ReportsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <div className="h-28 animate-pulse rounded-lg border bg-muted/30" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-lg border bg-muted/30" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-72 animate-pulse rounded-lg border bg-muted/30" />
        ))}
      </div>
    </div>
  );
}
