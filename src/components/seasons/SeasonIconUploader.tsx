"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { Loader2, ImageIcon } from "lucide-react";
import { updateSeason } from "@/actions/season.actions";

export function SeasonIconUploader({
  seasonId,
  currentUrl,
}: {
  seasonId: string;
  currentUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(currentUrl ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!url.trim() || !url.startsWith("http")) {
      toast.error("Please enter a valid image URL (must start with http)");
      return;
    }
    setLoading(true);
    try {
      await updateSeason(seasonId, { iconUrl: url.trim() });
      toast.success("Icon updated");
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update icon");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <ImageIcon className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Season Icon</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {url && (
            <div className="rounded-md overflow-hidden bg-muted flex items-center justify-center h-32">
              <img
                src={url}
                alt="Preview"
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
          <Input
            placeholder="Paste image URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Enter a direct image URL (PNG/JPG). Preview updates automatically.
          </p>
          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save Icon
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
