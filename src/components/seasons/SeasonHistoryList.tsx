"use client";

import RankBadge from "./RankBadge";
import type { StudentSeasonPoints, Season, SeasonRank } from "@prisma/client";

interface Props {
  records: Array<
    StudentSeasonPoints & { season: Season; rank: SeasonRank | null }
  >;
}

export default function SeasonHistoryList({ records }: Props) {
  if (records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No previous season records yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {records.map((r) => (
        <div
          key={r.id}
          className="flex items-center justify-between border rounded-md px-3 py-2"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {r.season.seasonCode}
              {r.season.displayName ? ` — ${r.season.displayName}` : ""}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {new Date(r.season.startDate).toLocaleDateString()} →{" "}
              {new Date(r.season.endDate).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {r.rank && <RankBadge rank={r.rank} size="sm" />}
            <span className="text-sm font-semibold">{r.totalPoints} pts</span>
          </div>
        </div>
      ))}
    </div>
  );
}
