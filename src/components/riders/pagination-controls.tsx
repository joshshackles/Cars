import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PaginationControls({
  page,
  pageCount,
  baseParams,
}: Readonly<{
  page: number;
  pageCount: number;
  baseParams: URLSearchParams;
}>) {
  const previous = new URLSearchParams(baseParams);
  previous.set("page", String(Math.max(1, page - 1)));
  const next = new URLSearchParams(baseParams);
  next.set("page", String(Math.min(pageCount, page + 1)));

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        Page {page} of {pageCount}
      </p>
      <div className="flex gap-2">
        {page <= 1 ? (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={`/riders?${previous.toString()}`}>Previous</Link>
          </Button>
        )}
        {page >= pageCount ? (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={`/riders?${next.toString()}`}>Next</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
