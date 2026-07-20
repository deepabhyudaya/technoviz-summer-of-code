"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import {
  startSeason,
  activateSeasonMultiplier,
  deactivateSeasonMultiplier,
} from "@/actions/season.actions";
import { RankLadderEditor } from "./RankLadderEditor";
import { PointConfigPanel } from "./PointConfigPanel";
import { SeasonIconUploader } from "./SeasonIconUploader";
import { SeasonConcludeDialog } from "./SeasonConcludeDialog";
import { SeasonEditDialog } from "./SeasonEditDialog";
import type { Season, SeasonRank, SeasonPointConfig } from "@prisma/client";

interface SeasonWithRanks extends Season {
  ranks: SeasonRank[];
  pointConfig: SeasonPointConfig | null;
}

export function SeasonList({ seasons }: { seasons: SeasonWithRanks[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [concludeTarget, setConcludeTarget] = useState<string | null>(null);

  const statusColor: Record<string, string> = {
    UPCOMING: "bg-slate-500",
    ACTIVE: "bg-green-500",
    CONCLUDING: "bg-amber-500",
    CONCLUDED: "bg-blue-500",
  };

  async function handleAction(
    action: () => Promise<any>,
    id: string,
    successMsg: string
  ) {
    setLoadingId(id);
    try {
      await action();
      toast.success(successMsg);
      window.location.reload();
    } catch (err: any) {
      toast.error(err?.message || "Action failed");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {seasons.length === 0 && (
        <p className="text-muted-foreground text-sm">No seasons created yet.</p>
      )}
      {seasons.map((s) => (
        <div
          key={s.id}
          className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            {s.iconUrl ? (
              <img
                src={s.iconUrl}
                alt={s.seasonCode}
                className="w-10 h-10 rounded-md object-cover bg-muted"
              />
            ) : (
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-xs font-bold">
                {s.seasonCode}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{s.seasonCode}</span>
                <Badge className={`${statusColor[s.status]} text-white`}>
                  {s.status}
                </Badge>
                {s.pointMultiplierActive && (
                  <Badge variant="secondary">
                    {s.pointMultiplierValue}x
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(s.startDate).toLocaleDateString()} →{" "}
                {new Date(s.endDate).toLocaleDateString()} ·{" "}
                {s.seasonType.toLowerCase()} · {s.ranks.length} ranks
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {s.status === "UPCOMING" && (
              <Button
                size="sm"
                variant="default"
                disabled={loadingId === s.id}
                onClick={() =>
                  handleAction(
                    () => startSeason(s.id),
                    s.id,
                    "Season started!"
                  )
                }
              >
                Start
              </Button>
            )}

            {s.status === "ACTIVE" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loadingId === s.id}
                  onClick={() =>
                    handleAction(
                      () => activateSeasonMultiplier(s.id, 2.0, "Weekend 2x"),
                      s.id,
                      "Multiplier activated!"
                    )
                  }
                >
                  2x Multiplier
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loadingId === s.id}
                  onClick={() =>
                    handleAction(
                      () => deactivateSeasonMultiplier(s.id),
                      s.id,
                      "Multiplier deactivated!"
                    )
                  }
                >
                  Reset Multiplier
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={loadingId === s.id}
                  onClick={() => setConcludeTarget(s.id)}
                >
                  Conclude
                </Button>
              </>
            )}

            <SeasonEditDialog
              seasonId={s.id}
              initialDisplayName={s.displayName}
              initialStartDate={s.startDate}
              initialEndDate={s.endDate}
              initialConquerorSize={s.conquerorSize}
            />

            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost">
                  Ranks
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Rank Ladder</DialogTitle>
                </DialogHeader>
                <RankLadderEditor seasonId={s.id} initialRanks={s.ranks} />
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost">
                  Points
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Point Config</DialogTitle>
                </DialogHeader>
                <PointConfigPanel
                  seasonId={s.id}
                  initialConfig={s.pointConfig}
                />
              </DialogContent>
            </Dialog>

            <SeasonIconUploader seasonId={s.id} currentUrl={s.iconUrl} />
          </div>
        </div>
      ))}

      {(() => {
        const target = seasons.find((s) => s.id === concludeTarget);
        if (!target) return null;
        return (
          <SeasonConcludeDialog
            seasonId={target.id}
            seasonCode={target.seasonCode}
            open={!!concludeTarget}
            onOpenChange={(open) => {
              if (!open) setConcludeTarget(null);
            }}
            onConcluded={() => window.location.reload()}
          />
        );
      })()}
    </div>
  );
}
