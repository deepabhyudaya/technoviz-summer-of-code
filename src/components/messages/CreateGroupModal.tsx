"use client";

import { useState } from "react";
import { createGroup } from "@/actions/group.actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Plus, Users, Copy, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CreateGroupModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id: number; accessCode: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await createGroup(name.trim(), description.trim());
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    if (!result) return;
    navigator.clipboard.writeText(result.accessCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) {
        setResult(null);
        setName("");
        setDescription("");
      }
    }}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted text-xs font-medium transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Create Group
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>
            Start a collaborative chat with your team or class.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col items-center gap-5 py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Group Created!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Share this code with others so they can join.
              </p>
            </div>
            <div className="bg-muted rounded-xl px-6 py-4 flex flex-col gap-2 w-full">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Group Access Code</p>
              <div className="flex items-center justify-between gap-3">
                <code className="text-sm font-mono font-bold text-foreground">{result.accessCode}</code>
                <button onClick={copyCode} className="shrink-0 p-1.5 rounded-md hover:bg-border transition-colors">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                router.push(`/messages?type=group&convId=${result.id}`);
              }}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium"
            >
              Go to Chat
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Group Name</label>
              <input
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Science Class 10A"
                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-foreground/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this group about?"
                rows={3}
                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-foreground/30 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="mt-2 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Creating..." : "Create Group"}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
