"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { updateSeason } from "@/actions/season.actions";
import { Edit, Loader2 } from "lucide-react";

export function SeasonEditDialog({
  seasonId,
  initialDisplayName,
  initialStartDate,
  initialEndDate,
  initialConquerorSize,
}: {
  seasonId: string;
  initialDisplayName: string | null;
  initialStartDate: Date;
  initialEndDate: Date;
  initialConquerorSize: number;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [displayName, setDisplayName] = useState(initialDisplayName || "");
  const [startDate, setStartDate] = useState(
    new Date(initialStartDate.getTime() - initialStartDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  );
  const [endDate, setEndDate] = useState(
    new Date(initialEndDate.getTime() - initialEndDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  );
  const [conquerorSize, setConquerorSize] = useState(initialConquerorSize);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error("Start and end dates are required");
      return;
    }
    setLoading(true);
    try {
      await updateSeason(seasonId, {
        displayName: displayName || undefined,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        conquerorSize,
      });
      toast.success("Season updated successfully!");
      setOpen(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update season");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Season Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Display Name (optional)</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. The Iron Age"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Conqueror Size (top N leaderboard spots)</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={conquerorSize}
              onChange={(e) => setConquerorSize(Number(e.target.value))}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Save Changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
