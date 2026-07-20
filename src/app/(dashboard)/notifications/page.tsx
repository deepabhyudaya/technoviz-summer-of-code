import { auth } from "@clerk/nextjs/server";
import { getMyNotifications } from "@/actions/notification.actions";
import NotificationsClient from "./NotificationsClient";

export default async function NotificationsPage() {
  const { userId } = auth();
  if (!userId) return null;

  const notifications = await getMyNotifications(100);

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 bg-background h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex flex-col gap-1 shrink-0">
        <h1 className="text-3xl font-black tracking-tight text-foreground">Notifications</h1>
        <p className="text-sm text-muted-foreground font-medium">
          Updates about new activity relevant to you.
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <NotificationsClient initialItems={notifications as any} />
      </div>
    </div>
  );
}

