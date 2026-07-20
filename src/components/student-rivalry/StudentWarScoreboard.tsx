import { getStudentScoreboard } from "@/actions/student-rivalry.actions";

type Props = {
  rivalryId: string;
  compact?: boolean;
};

export default async function StudentWarScoreboard({ rivalryId, compact = false }: Props) {
  const data = await getStudentScoreboard(rivalryId);

  const total = data.studentA.rawScore + data.studentB.rawScore;
  const barA = total > 0 ? Math.round((data.studentA.rawScore / total) * 100) : 50;
  const barB = 100 - barA;

  const leading =
    data.studentA.rawScore > data.studentB.rawScore ? data.studentA.name :
    data.studentB.rawScore > data.studentA.rawScore ? data.studentB.name : null;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-blue-900/30 via-card to-red-900/30 px-5 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Live Scoreboard</span>
        {data.status === "CONCLUDED" && data.winnerStudentId && (
          <span className="text-xs font-bold text-yellow-400">🏆 Duel Concluded</span>
        )}
        {data.status === "ACTIVE" && leading && (
          <span className="text-xs text-muted-foreground">{leading} leads</span>
        )}
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className={`rounded-xl p-4 border ${data.winnerStudentId === data.studentA.id ? "border-yellow-500 bg-yellow-500/10" : "border-blue-500/30 bg-blue-500/5"}`}>
            <div className="font-bold text-base text-blue-400 truncate">{data.studentA.name}</div>
            <div className="mt-2 font-black text-3xl tabular-nums">{Math.round(data.studentA.rawScore)}</div>
            <div className="text-xs text-muted-foreground">raw pts</div>
          </div>

          <div className={`rounded-xl p-4 border text-right ${data.winnerStudentId === data.studentB.id ? "border-yellow-500 bg-yellow-500/10" : "border-red-500/30 bg-red-500/5"}`}>
            <div className="font-bold text-base text-red-400 truncate">{data.studentB.name}</div>
            <div className="mt-2 font-black text-3xl tabular-nums">{Math.round(data.studentB.rawScore)}</div>
            <div className="text-xs text-muted-foreground">raw pts</div>
          </div>
        </div>

        <div>
          <div className="text-center text-xs text-muted-foreground mb-2">⚔️ VS ⚔️</div>
          <div className="flex h-3 rounded-full overflow-hidden">
            <div className="bg-blue-500 transition-all duration-700" style={{ width: `${barA}%` }} />
            <div className="bg-red-500 transition-all duration-700" style={{ width: `${barB}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{barA}%</span>
            <span>{barB}%</span>
          </div>
        </div>

        {!compact && data.bouts.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Bout History ({data.totalBouts})
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {data.bouts.map((bout: any, i: number) => (
                <div key={bout.id} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground w-5">#{i + 1}</span>
                  <span className="flex-1 truncate font-medium">{bout.title}</span>
                  <span className="text-blue-400 font-bold">{bout.studentAPoints}</span>
                  <span className="text-muted-foreground">–</span>
                  <span className="text-red-400 font-bold">{bout.studentBPoints}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center">
          Raw scores · {data.totalBouts} bout{data.totalBouts !== 1 ? "s" : ""} played
        </div>
      </div>
    </div>
  );
}
