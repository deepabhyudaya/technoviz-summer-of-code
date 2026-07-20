"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

// Prefetches the routes the user is statistically most likely to navigate to
// next, role-aware. Previously this prefetched non-existent /dashboard/* paths
// and effectively did nothing.
export function RoutePrefetcher() {
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    const role = (user?.publicMetadata?.role as string) || "student";

    // High-priority — prefetch immediately on mount.
    const critical = [
      "/profile",
      "/notifications",
      "/messages",
      "/list/messages",
      "/settings",
    ];

    // Role-specific dashboards & secondary pages prefetched after idle to
    // avoid contending with the current route's resources.
    const secondaryByRole: Record<string, string[]> = {
      admin: ["/admin", "/list/teachers", "/list/students", "/list/announcements", "/list/tickets", "/list/rivalries"],
      teacher: ["/teacher", "/list/lessons", "/list/students", "/list/announcements", "/list/results"],
      student: ["/student", "/student/courses/my", "/list/results", "/list/announcements", "/student/rivalry", "/servers"],
      parent: ["/parent", "/list/results", "/list/announcements", "/list/exams"],
    };

    critical.forEach((r) => router.prefetch(r));

    const idleHandle = (window as any).requestIdleCallback
      ? (window as any).requestIdleCallback(() => {
          (secondaryByRole[role] || []).forEach((r) => router.prefetch(r));
        })
      : setTimeout(() => {
          (secondaryByRole[role] || []).forEach((r) => router.prefetch(r));
        }, 1500);

    return () => {
      if ((window as any).cancelIdleCallback && typeof idleHandle === "number") {
        (window as any).cancelIdleCallback(idleHandle);
      } else {
        clearTimeout(idleHandle as any);
      }
    };
  }, [router, user?.publicMetadata?.role]);

  return null;
}