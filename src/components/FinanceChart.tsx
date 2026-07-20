"use client";

import dynamic from "next/dynamic";

// FinanceChart takes no props.
const LazyFinanceChart = dynamic(() => import("./FinanceChartInner"), {
  ssr: false,
  loading: () => <div className="w-full h-full rounded-md bg-muted animate-pulse" />,
});

export default function FinanceChart() {
  return <LazyFinanceChart />;
}
