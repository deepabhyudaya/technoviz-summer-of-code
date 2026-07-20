"use client";

import { Sparkles } from "lucide-react";

interface AiBadgeProps {
  size?: "sm" | "md";
}

export function AiBadge({ size = "sm" }: AiBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2 py-0.5 text-xs font-medium text-white">
      <Sparkles size={size === "sm" ? 10 : 12} />
      AI
    </span>
  );
}
