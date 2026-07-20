"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";
import { createSeasonRank, updateSeasonRank, deleteSeasonRank } from "@/actions/season-rank.actions";
import type { SeasonRank } from "@prisma/client";

export function RankLadderEditor({
  seasonId,
  initialRanks,
}: {
  seasonId: string;
  initialRanks: SeasonRank[];
}) {
  const [ranks, setRanks] = useState<SeasonRank[]>(
    [...initialRanks].sort((a, b) => a.rankOrder - b.rankOrder)
  );
  const [loading, setLoading] = useState(false);
  const [newRank, setNewRank] = useState({
    rankOrder: ranks.length + 1,
    rankName: "",
    minPoints: 0,
    minPoints: 0,
    colorHex: "#EAB308",
    isConqueror: false,
    iconUrl: "",
  });

  async function handleAdd() {
    if (!newRank.rankName) return;
    setLoading(true);
    try {
      const created = await createSeasonRank(seasonId, {
        rankOrder: newRank.rankOrder,
        rankName: newRank.rankName,
        minPoints: newRank.minPoints,
        minPoints: newRank.minPoints,
        colorHex: newRank.colorHex,
        isConqueror: newRank.isConqueror,
        iconUrl: newRank.iconUrl || undefined,
      });
      setRanks((prev) =>
        [...prev, created].sort((a, b) => a.rankOrder - b.rankOrder)
      );
      setNewRank({
        rankOrder: newRank.rankOrder + 1,
        rankName: "",
        minPoints: 0,
        colorHex: "#EAB308",
        isConqueror: false,
        iconUrl: "",
      });
      toast.success("Rank added");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add rank");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(
    id: string,
    data: Partial<{ rankName: string; minPoints: number; colorHex: string | undefined; isConqueror: boolean }>
  ) {
    try {
      await updateSeasonRank(id, data);
      setRanks((prev) =>
        prev
          .map((r) => (r.id === id ? { ...r, ...data } : r))
          .sort((a, b) => a.rankOrder - b.rankOrder)
      );
      toast.success("Rank updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update rank");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this rank?")) return;
    try {
      await deleteSeasonRank(id);
      setRanks((prev) => prev.filter((r) => r.id !== id));
      toast.success("Rank deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete rank");
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {ranks.map((r) => (
          <div
            key={r.id}
            className="flex flex-col gap-2 border rounded-md p-2"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: r.colorHex || "#ccc" }}
              />
              <Input
                className="flex-1 min-w-0"
                value={r.rankName}
                onChange={(e) =>
                  handleUpdate(r.id, { rankName: e.target.value })
                }
              />
              <Input
                type="number"
                className="w-24"
                value={r.minPoints}
                onChange={(e) =>
                  handleUpdate(r.id, { minPoints: Number(e.target.value) })
                }
              />
              <input
                type="color"
                className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
                value={r.colorHex || "#EAB308"}
                onChange={(e) =>
                  handleUpdate(r.id, { colorHex: e.target.value || undefined })
                }
              />
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500"
                onClick={() => handleDelete(r.id)}
              >
                ✕
              </Button>
            </div>
            <div className="flex items-center gap-2 pl-5">
              {r.iconUrl ? (
                <img
                  src={r.iconUrl}
                  alt={r.rankName}
                  className="w-6 h-6 rounded-sm object-cover bg-muted"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://via.placeholder.com/24?text=Err";
                  }}
                />
              ) : (
                <div className="w-6 h-6 rounded-sm bg-muted flex items-center justify-center text-[10px] text-muted-foreground border shrink-0">
                  N/A
                </div>
              )}
              <Input
                className="flex-1 h-8 text-xs"
                placeholder="Icon URL (optional)"
                value={r.iconUrl || ""}
                onChange={(e) =>
                  handleUpdate(r.id, { iconUrl: e.target.value })
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Add Rank</p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Rank name"
              value={newRank.rankName}
              onChange={(e) =>
                setNewRank((p) => ({ ...p, rankName: e.target.value }))
              }
            />
            <Input
              type="number"
              className="w-24"
              placeholder="Min pts"
              value={newRank.minPoints}
              onChange={(e) =>
                setNewRank((p) => ({ ...p, minPoints: Number(e.target.value) }))
              }
            />
            <input
              type="color"
              className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
              value={newRank.colorHex}
              onChange={(e) =>
                setNewRank((p) => ({ ...p, colorHex: e.target.value }))
              }
            />
            <Button size="sm" onClick={handleAdd} disabled={loading}>
              Add
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {newRank.iconUrl ? (
              <img
                src={newRank.iconUrl}
                alt="New Rank Icon"
                className="w-6 h-6 rounded-sm object-cover bg-muted"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://via.placeholder.com/24?text=Err";
                }}
              />
            ) : (
              <div className="w-6 h-6 rounded-sm bg-muted flex items-center justify-center text-[10px] text-muted-foreground border shrink-0">
                N/A
              </div>
            )}
            <Input
              className="flex-1 h-8 text-xs"
              placeholder="Icon URL (optional)"
              value={newRank.iconUrl || ""}
              onChange={(e) =>
                setNewRank((p) => ({ ...p, iconUrl: e.target.value }))
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
