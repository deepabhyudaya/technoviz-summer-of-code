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
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { triggerSeasonConclusion } from "@/actions/season.actions";
import { Loader2, AlertTriangle } from "lucide-react";

interface Props {
  seasonId: string;
  seasonCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConcluded?: () => void;
}

export function SeasonConcludeDialog({
  seasonId,
  seasonCode,
  open,
  onOpenChange,
  onConcluded,
}: Props) {
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);

  const expected = `CONCLUDE ${seasonCode}`;
  const matches = typed.trim() === expected;

  async function handleConclude() {
    if (!matches) return;
    setLoading(true);
    try {
      await triggerSeasonConclusion(seasonId);
      toast.success("Season conclusion triggered. 48h wind-down started.");
      setTyped("");
      onOpenChange(false);
      onConcluded?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to conclude season");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={20} />
            Conclude Season
          </DialogTitle>
          <DialogDescription>
            This will begin the 48-hour wind-down before finalizing. Wars can
            still conclude during this period, but no new wars can be proposed.
            This action is irreversible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm">
            To confirm, type exactly: <strong className="font-mono">{expected}</strong>
          </p>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={expected}
            className="font-mono"
          />
          <Button
            variant="destructive"
            className="w-full"
            disabled={!matches || loading}
            onClick={handleConclude}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            I Understand — Conclude Season
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
