import Link from "next/link";
import { AlertTriangle, MessageSquare, Route } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { getNotificationInbox, getNotificationSummary } from "@/lib/notifications/notification-queries";

type NotificationInboxProps = {
  summary: Awaited<ReturnType<typeof getNotificationSummary>>;
  inbox: Awaited<ReturnType<typeof getNotificationInbox>>;
};

export function NotificationsInbox({ summary, inbox }: NotificationInboxProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={AlertTriangle} label="Open incidents" value={summary.openIncidents} />
        <SummaryCard icon={Route} label="Trips needing attention" value={summary.attentionTrips} />
        <SummaryCard icon={MessageSquare} label="Recent messages" value={summary.recentMessages} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Incident alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {inbox.incidents.length > 0 ? (
              <div className="flex flex-col gap-3">
                {inbox.incidents.map((incident) => (
                  <AlertItem
                    key={incident.id}
                    title={incident.summary}
                    detail={incident.rider?.displayName ?? incident.driver?.displayName ?? "Unlinked incident"}
                    time={incident.occurredAt}
                    badge={formatLabel(incident.severity)}
                    badgeTone={incident.severity === "HIGH" || incident.severity === "CRITICAL" ? "destructive" : "secondary"}
                    href="/incidents"
                  />
                ))}
              </div>
            ) : (
              <EmptyPanel message="No open incident alerts." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attention queue</CardTitle>
          </CardHeader>
          <CardContent>
            {inbox.attentionTrips.length > 0 ? (
              <div className="flex flex-col gap-3">
                {inbox.attentionTrips.map((trip) => (
                  <AlertItem
                    key={trip.id}
                    title={`${trip.rideRequest.rider.displayName} needs dispatch review`}
                    detail={`${trip.assignment?.driver?.displayName ?? "No driver"} - ${trip.pickupCounty ?? "pickup"} to ${trip.dropoffCounty ?? "dropoff"}`}
                    time={trip.scheduledPickupAt}
                    badge="Needs attention"
                    badgeTone="destructive"
                    href="/dispatch"
                  />
                ))}
              </div>
            ) : (
              <EmptyPanel message="No trips are currently in the attention queue." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent communication</CardTitle>
          </CardHeader>
          <CardContent>
            {inbox.communications.length > 0 ? (
              <div className="flex flex-col gap-3">
                {inbox.communications.map((communication) => (
                  <AlertItem
                    key={communication.id}
                    title={communication.subject ?? formatLabel(communication.type)}
                    detail={communication.driver?.displayName ?? communication.rider?.displayName ?? truncate(communication.body)}
                    time={communication.occurredAt}
                    badge={formatLabel(communication.type)}
                    badgeTone="secondary"
                    href={communication.incidentId ? "/incidents" : "/dispatch"}
                  />
                ))}
              </div>
            ) : (
              <EmptyPanel message="No recent communication logs." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: Readonly<{
  icon: LucideIcon;
  label: string;
  value: number;
}>) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex size-12 items-center justify-center rounded-md bg-secondary text-cars-navy">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold text-cars-navy">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertItem({
  title,
  detail,
  time,
  badge,
  badgeTone,
  href,
}: Readonly<{
  title: string;
  detail: string;
  time: Date;
  badge: string;
  badgeTone: "secondary" | "destructive";
  href: string;
}>) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium leading-6">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
          <p className="mt-1 text-xs text-muted-foreground">{time.toLocaleString()}</p>
        </div>
        <Badge variant={badgeTone}>{badge}</Badge>
      </div>
      <Button asChild variant="outline" size="sm" className="mt-3">
        <Link href={href}>Open</Link>
      </Button>
    </div>
  );
}

function EmptyPanel({ message }: Readonly<{ message: string }>) {
  return (
    <div className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function truncate(value: string) {
  return value.length > 80 ? `${value.slice(0, 77)}...` : value;
}
