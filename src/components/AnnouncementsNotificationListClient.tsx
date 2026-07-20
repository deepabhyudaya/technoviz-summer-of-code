"use client";

import * as React from "react";
import { NotificationList, type NotificationItem } from "@/components/animate-ui/components/community/notification-list";
import { NotificationCommandDialog } from "@/components/NotificationCommandDialog";

interface Props {
  /** Preview items shown in the stacked card UI (up to 5) */
  preview: NotificationItem[];
  /** All items for the searchable command dialog */
  all: NotificationItem[];
}

export function AnnouncementsNotificationListClient({ preview, all }: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <NotificationList
        notifications={preview}
        onViewAll={() => setOpen(true)}
      />
      <NotificationCommandDialog
        open={open}
        onOpenChange={setOpen}
        items={all}
        heading="Announcements"
      />
    </>
  );
}
