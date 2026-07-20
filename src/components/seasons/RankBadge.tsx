import type { SeasonRank } from "@prisma/client";

interface RankBadgeProps {
  rank: SeasonRank | null | undefined;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-[10px] px-1.5 py-0.5 rounded",
  md: "text-xs px-2.5 py-1 rounded-md",
  lg: "text-sm px-3 py-1.5 rounded-lg",
};

export default function RankBadge({ rank, size = "md" }: RankBadgeProps) {
  if (!rank) {
    return (
      <span
        className={`inline-block font-semibold bg-muted text-muted-foreground ${sizeClasses[size]}`}
      >
        Unranked
      </span>
    );
  }

  const bg = rank.colorHex || "#EAB308";

  return (
    <span
      className={`inline-block font-semibold text-white ${sizeClasses[size]}`}
      style={{ backgroundColor: bg }}
      title={`${rank.rankName} — ${rank.minPoints} pts required`}
    >
      {rank.iconUrl && (
        <img
          src={rank.iconUrl}
          alt=""
          className="inline-block w-3.5 h-3.5 mr-1 align-text-bottom"
        />
      )}
      {rank.rankName}
    </span>
  );
}
