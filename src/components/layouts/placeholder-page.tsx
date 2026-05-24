import { EmptyState } from "@/components/layouts/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PlaceholderPage({
  title,
  description,
  emptyTitle,
  emptyDescription,
}: Readonly<{
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
}>) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} />
      <Card>
        <CardHeader>
          <CardTitle>{title} workspace</CardTitle>
          <CardDescription>Prepared route, layout, and empty state.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </CardContent>
      </Card>
    </div>
  );
}
