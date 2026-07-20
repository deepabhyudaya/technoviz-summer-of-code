"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, Clock, Trophy, TrendingUp } from "lucide-react";

const timeframes = [
  { value: "today", label: "Today", icon: Clock },
  { value: "week", label: "This Week", icon: Calendar },
  { value: "month", label: "This Month", icon: TrendingUp },
  { value: "all", label: "All Time", icon: Trophy },
] as const;

export type Timeframe = (typeof timeframes)[number]["value"];

interface TimeframeTabsProps {
  current: Timeframe;
  onChange?: (value: Timeframe) => void;
}

export function TimeframeTabs({ current, onChange }: TimeframeTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: Timeframe) => {
    if (onChange) {
      onChange(value);
    } else {
      const params = new URLSearchParams(searchParams);
      params.set("timeframe", value);
      router.push(`/leaderboard?${params.toString()}`, { scroll: false });
    }
  };

  return (
    <div className="relative flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
      {timeframes.map((timeframe) => {
        const Icon = timeframe.icon;
        const isActive = current === timeframe.value;

        return (
          <button
            key={timeframe.value}
            onClick={() => handleChange(timeframe.value)}
            className={`
              relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md
              transition-colors duration-200
              ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}
            `}
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-background rounded-md shadow-sm border border-border"
                transition={{ type: "spring", duration: 0.5 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon size={14} />
              {timeframe.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
