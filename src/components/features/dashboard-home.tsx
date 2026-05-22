import { Activity, CalendarClock, ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/layouts/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const overviewItems = [
  {
    title: "Today",
    description: "Dispatch activity will appear here once ride operations are connected.",
    icon: CalendarClock,
  },
  {
    title: "Requests",
    description: "Intake, eligibility, and scheduling queues are ready for future data.",
    icon: ClipboardList,
  },
  {
    title: "Operations",
    description: "Role-aware operational signals will live in this dashboard area.",
    icon: Activity,
  },
];

export function DashboardHome() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="A clean operations cockpit for volunteer transportation teams."
        actions={<Badge variant="secondary">Architecture scaffold</Badge>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {overviewItems.map((item) => (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </div>
              <item.icon className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Operations board</CardTitle>
          <CardDescription>
            This surface is intentionally empty until real dispatch requirements are defined.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No live operations data"
            description="Connect riders, drivers, ride requests, and dispatch rules before showing operational data."
          />
        </CardContent>
      </Card>
    </div>
  );
}
