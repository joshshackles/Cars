import Link from "next/link";
import { EmptyState } from "@/components/layouts/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { RideRequestsTable } from "@/components/ride-requests/ride-requests-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { getRideRequests } from "@/lib/ride-requests/ride-request-queries";

export default async function RideRequestsPage() {
  const membership = await requirePermission("ride_requests:view");
  const rideRequests = await getRideRequests(membership.organizationId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ride Requests"
        description="Review incoming transportation requests and generated trip legs."
        actions={
          hasPermission(membership, "ride_requests:manage") ? (
            <Button asChild size="sm">
              <Link href="/ride-requests/new">New intake</Link>
            </Button>
          ) : null
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Request queue</CardTitle>
        </CardHeader>
        <CardContent>
          {rideRequests.length > 0 ? (
            <RideRequestsTable rideRequests={rideRequests} />
          ) : (
            <EmptyState
              title="No ride requests"
              description="Create an intake request to generate trip legs and begin assignment review."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
