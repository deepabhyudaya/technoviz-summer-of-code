"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type CountChartInner from "./CountChartInner";

// Defer recharts (~100KB gz) until after hydration; chart is not interactive
// before paint anyway, and it's below-the-fold on the admin dashboard.
const LazyCountChart = dynamic(() => import("./CountChartInner"), {
  ssr: false,
  loading: () => <div className="w-full h-full rounded-full bg-muted animate-pulse" />,
});

export default function CountChart(props: ComponentProps<typeof CountChartInner>) {
  return <LazyCountChart {...props} />;
}
