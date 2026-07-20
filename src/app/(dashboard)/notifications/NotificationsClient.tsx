"use client";

import { useMemo, useState } from "react";
import { markAllMyNotificationsAsRead, markNotificationAsRead } from "@/actions/notification.actions";
import { Check, CheckCheck } from "lucide-react";

export default function NotificationsClient({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState<any[]>(initialItems ?? []);
  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);

  const markOne = async (id: number) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    await markNotificationAsRead(id);
  };

  const markAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await markAllMyNotificationsAsRead();
  };

  return (
    <div className="h-full rounded-lg border border-border overflow-hidden bg-background flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
        <div className="text-sm text-muted-foreground">
          {unreadCount > 0 ? (
            <span>
              <span className="font-semibold text-foreground">{unreadCount}</span> unread
            </span>
          ) : (
            <span>All caught up</span>
          )}
        </div>
        <button
          onClick={markAll}
          disabled={unreadCount === 0}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          <CheckCheck className="size-4" />
          Mark all read
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2 bg-[#fafafa] dark:bg-[#111113]">
        {items.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-12">
            No notifications yet.
          </div>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              onClick={() => markOne(n.id)}
              className={`w-full text-left p-4 rounded-md border transition-colors ${
                n.isRead
                  ? "border-border bg-background hover:bg-muted/50"
                  : "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[14px] text-foreground line-clamp-1">{n.title}</p>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                  <p className="text-[11px] text-muted-foreground mt-2 font-mono">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.isRead && (
                  <div className="shrink-0 text-blue-600 dark:text-blue-400">
                    <Check className="size-4" />
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

