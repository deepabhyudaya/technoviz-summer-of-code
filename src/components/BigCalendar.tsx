"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type BigCalendarInner from "./BigCalendarInner";

// Lazy-load the calendar so `react-big-calendar` + `moment` (~150KB gz) and
// the calendar CSS only ship on routes that actually render the calendar,
// AFTER hydration. Page TTI on /admin, /teacher, /student, /parent improves
// noticeably since the calendar is below-the-fold on those dashboards.
const LazyBigCalendar = dynamic(() => import("./BigCalendarInner"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-card text-card-foreground rounded-lg border border-border animate-pulse" />
  ),
});

export default function BigCalendar(props: ComponentProps<typeof BigCalendarInner>) {
  return <LazyBigCalendar {...props} />;
}
