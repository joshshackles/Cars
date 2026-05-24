import { NotificationsInbox } from "@/components/notifications/notifications-inbox";
import { PageHeader } from "@/components/layouts/page-header";
import { requirePermission } from "@/lib/auth/guards";
import {
  getNotificationInbox,
  getNotificationSummary,
} from "@/lib/notifications/notification-queries";

export default async function NotificationsPage() {
  const membership = await requirePermission("incidents:view");
  const [summary, inbox] = await Promise.all([
    getNotificationSummary(membership.organizationId),
    getNotificationInbox(membership.organizationId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="A real-time operations inbox for incidents, attention trips, and recent driver or dispatch messages."
      />
      <NotificationsInbox summary={summary} inbox={inbox} />
    </div>
  );
}
