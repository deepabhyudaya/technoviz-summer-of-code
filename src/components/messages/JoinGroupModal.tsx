"use client";

import { useState } from "react";
import { joinGroupByCode } from "@/actions/group.actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { LogIn, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function JoinGroupModal() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const groupId = await joinGroupByCode(code.trim());
      setOpen(false);
      router.push(`/messages?type=group&convId=${groupId}`);
    } catch (e: any) {
      setError(e.message || "Failed to join group. Please check the code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) {
        setCode("");
        setError("");
      }
    }}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted text-xs font-medium transition-colors">
          <LogIn className="w-3.5 h-3.5" />
          Join Group
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Join a Group</DialogTitle>
          <DialogDescription>
            Enter the access code shared by the group owner.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Access Code</label>
            <input
              autoFocus
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. ABC12345"
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-foreground/30"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="mt-2 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Joining..." : "Join Group"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
