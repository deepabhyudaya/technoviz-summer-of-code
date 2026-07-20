"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const BADGE_NAMES: Record<string, string> = {
  ATTENDANCE_STREAK: "Attendance Streak",
  RESULTS_90: "Top Scorer",
  LEADERBOARD_ALL_TIME: "Leaderboard All Time",
  LEADERBOARD_MONTH: "Leaderboard Monthly",
  LEADERBOARD_WEEK: "Leaderboard Weekly",
  LEADERBOARD_TODAY: "Leaderboard Today",
  COURSES_COMPLETED: "Courses Completed",
  VERIFIED_ANSWERS: "Verified Answers",
};

export function BadgeTooltip({ badge, children }: { badge: any, children: React.ReactNode }) {
  const name = BADGE_NAMES[badge.category] || formatBadgeName(badge.category);
  const count = badge.count ?? 0;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div className="cursor-pointer">{children}</div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>{name}: earned {count} {count === 1 ? 'time' : 'times'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function formatBadgeName(category: string) {
  return category.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}
