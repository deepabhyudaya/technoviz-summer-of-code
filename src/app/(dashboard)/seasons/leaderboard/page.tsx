import { getActiveSeason, getSeasonLeaderboard } from "@/actions/season.actions";
import RankBadge from "@/components/seasons/RankBadge";
import { Trophy, Medal } from "lucide-react";
import type { BranchSeasonPoints, StudentSeasonPoints, SeasonRank } from "@prisma/client";

export default async function SeasonLeaderboardPage() {
  const activeSeason = await getActiveSeason();
  if (!activeSeason) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <Trophy size={48} className="mx-auto text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold">No Active Season</h1>
        <p className="text-muted-foreground mt-2">
          There is currently no active season. Check back later!
        </p>
      </div>
    );
  }

  const rawBranch: any[] = await getSeasonLeaderboard(activeSeason.id, "branch");
  const rawStudent: any[] = await getSeasonLeaderboard(activeSeason.id, "student");

  const branchRows = rawBranch.map((b: any) => ({
    entityName: b.class?.name ?? "Unknown",
    points: b.totalPoints ?? 0,
    warsWon: b.warsWon ?? 0,
    warsLost: b.warsLost ?? 0,
    rank: b.rank as SeasonRank | null,
    isConqueror: b.isConqueror ?? false,
    conquerorRank: b.conquerorRank ?? null,
  }));

  const studentRows = rawStudent.map((s: any) => ({
    entityName: s.student?.name ?? "Unknown",
    points: s.totalPoints ?? 0,
    warsWon: s.warsWon ?? 0,
    warsLost: s.warsLost ?? 0,
    rank: s.rank as SeasonRank | null,
    isConqueror: s.isConqueror ?? false,
    conquerorRank: s.conquerorRank ?? null,
  }));

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3">
        <Trophy size={28} className="text-primary" />
        <div>
          <h1 className="text-2xl font-bold">
            {activeSeason.seasonCode} Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeSeason.displayName || ""}{" "}
            {activeSeason.pointMultiplierActive && (
              <span className="text-amber-500 font-semibold">
                · {activeSeason.pointMultiplierValue}x MULTIPLIER
              </span>
            )}
          </p>
        </div>
      </div>

      <LeaderboardSection title="Branch Wars" rows={branchRows} />
      <LeaderboardSection title="Student Wars" rows={studentRows} />
    </div>
  );
}

function LeaderboardSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    entityName: string;
    points: number;
    warsWon: number;
    warsLost: number;
    rank: SeasonRank | null;
    isConqueror: boolean;
    conquerorRank: number | null;
  }>;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Medal size={18} className="text-primary" />
        {title}
      </h2>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-2 w-12">#</th>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Rank</th>
              <th className="text-right px-4 py-2">Pts</th>
              <th className="text-right px-4 py-2">W</th>
              <th className="text-right px-4 py-2">L</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                  No entries yet.
                </td>
              </tr>
            )}
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t">
                <td className="px-4 py-2 font-mono text-muted-foreground">
                  {idx + 1}
                </td>
                <td className="px-4 py-2 font-medium">{row.entityName}</td>
                <td className="px-4 py-2">
                  {row.rank ? (
                    <RankBadge rank={row.rank} size="sm" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right font-semibold">
                  {row.points.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right text-green-600">
                  {row.warsWon}
                </td>
                <td className="px-4 py-2 text-right text-red-500">
                  {row.warsLost}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
