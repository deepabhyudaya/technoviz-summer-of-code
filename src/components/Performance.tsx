"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type PerformanceInner from "./PerformanceInner";

const LazyPerformance = dynamic(() => import("./PerformanceInner"), {
  ssr: false,
  loading: () => <div className="w-full h-full rounded-md bg-muted animate-pulse" />,
});

export default function Performance(props: ComponentProps<typeof PerformanceInner>) {
  return <LazyPerformance {...props} />;
}
