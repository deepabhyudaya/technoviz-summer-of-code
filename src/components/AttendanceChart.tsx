"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type AttendanceChartInner from "./AttendanceChartInner";

const LazyAttendanceChart = dynamic(() => import("./AttendanceChartInner"), {
  ssr: false,
  loading: () => <div className="w-full h-full rounded-md bg-muted animate-pulse" />,
});

export default function AttendanceChart(props: ComponentProps<typeof AttendanceChartInner>) {
  return <LazyAttendanceChart {...props} />;
}
