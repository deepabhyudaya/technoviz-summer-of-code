import RankBadge from "./RankBadge";
import type { SeasonRank } from "@prisma/client";

interface Props {
  points: number;
  warsWon: number;
  warsLost: number;
  rank?: SeasonRank | null;
  isConqueror?: boolean;
  conquerorRank?: number | null;
}

export default function SeasonPointsCard({
  points,
  warsWon,
  warsLost,
  rank,
  isConqueror,
  conquerorRank,
}: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          Season Points
        </span>
        {isConqueror && (
          <span className="text-[10px] font-bold text-amber-500 border border-amber-500 rounded px-1.5 py-0.5">
            #{conquerorRank} CONQUEROR
          </span>
        )}
      </div>
      <p className="text-3xl font-bold mb-3">{points.toLocaleString()}</p>
      <div className="flex items-center gap-2 mb-3">
        <RankBadge rank={rank} />
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="text-green-600 font-medium">{warsWon}W</span>
        <span className="text-red-500 font-medium">{warsLost}L</span>
        <span>{warsWon + warsLost} total</span>
      </div>
    </div>
  );
}
