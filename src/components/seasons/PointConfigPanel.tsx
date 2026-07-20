"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
import type { SeasonPointConfig } from "@prisma/client";

async function updatePointConfig(
  seasonId: string,
  data: Partial<SeasonPointConfig>
) {
  const res = await fetch("/api/seasons/point-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seasonId, ...data }),
  });
  if (!res.ok) throw new Error("Failed to update point config");
  return res.json();
}

const FIELDS: { key: keyof SeasonPointConfig; label: string }[] = [
  { key: "branchWarWin", label: "Branch War Win" },
  { key: "branchWarWinDominant", label: "Branch War Dominant Win" },
  { key: "branchWarPerfect", label: "Branch War Perfect" },
  { key: "branchWarLoss", label: "Branch War Loss" },
  { key: "branchWarRoundWin", label: "Branch War Round Win" },
  { key: "branchWarMvpBonus", label: "Branch War MVP Bonus" },
  { key: "individualBranchWin", label: "Individual Branch Win" },
  { key: "individualWarriorBonus", label: "Warrior Bonus" },
  { key: "individualWarriorWinBonus", label: "Warrior Win Bonus" },
  { key: "individualMvpBonus", label: "Individual MVP Bonus" },
  { key: "individualLoserTopScorer", label: "Loser Top Scorer" },
  { key: "individualParticipation", label: "Participation" },
  { key: "studentWarWin", label: "Student War Win" },
  { key: "studentWarSweep", label: "Student War Sweep" },
  { key: "studentWarLoss", label: "Student War Loss" },
  { key: "studentWarUnderdog", label: "Student War Underdog" },
  { key: "studentWarAllyWin", label: "Student War Ally Win" },
];

export function PointConfigPanel({
  seasonId,
  initialConfig,
}: {
  seasonId: string;
  initialConfig: SeasonPointConfig | null;
}) {
  const [config, setConfig] = useState<Partial<SeasonPointConfig>>(
    initialConfig ?? {}
  );
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      await updatePointConfig(seasonId, config);
      toast.success("Point config saved");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
      {FIELDS.map(({ key, label }) => (
        <div key={key} className="flex items-center justify-between gap-3">
          <Label className="text-sm flex-1">{label}</Label>
          <Input
            type="number"
            className="w-24"
            value={(config[key] as number) ?? 0}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                [key]: Number(e.target.value),
              }))
            }
          />
        </div>
      ))}
      <Button onClick={handleSave} disabled={loading} className="w-full mt-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        Save Config
      </Button>
    </div>
  );
}
