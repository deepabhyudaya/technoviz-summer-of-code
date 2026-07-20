"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { joinServerByCode } from "@/actions/server.actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, ArrowRight, Hash } from "lucide-react";
import Link from "next/link";

interface JoinServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function JoinServerModal({ open, onOpenChange }: JoinServerModalProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ serverId: string; alreadyMember: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await joinServerByCode(code.trim().toUpperCase());
      setSuccess(result);
    } catch (err) {
      setError("Invalid invite code. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setCode("");
      setError(null);
      setSuccess(null);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        {!success ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Join a Server</DialogTitle>
              <DialogDescription>
                Enter an invite code to join an existing server.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Invite Code</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    autoFocus
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="XXXXXXXX"
                    maxLength={10}
                    className="w-full bg-muted/50 border border-border rounded-lg pl-10 pr-3 py-2 text-sm font-mono tracking-wider outline-none focus:ring-1 focus:ring-primary uppercase"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <p>Invite codes look like this:</p>
                <code className="text-foreground font-mono bg-background px-2 py-1 rounded mt-1 inline-block">
                  ABC123DE
                </code>
              </div>

              <div className="flex gap-2 pt-2">
                <Link
                  href="/servers/discover"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted transition-colors text-center"
                >
                  Browse Public
                </Link>
                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      Join Server
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <DialogTitle className="text-center text-xl">
                {success.alreadyMember ? "Already a Member!" : "Welcome!"}
              </DialogTitle>
              <DialogDescription className="text-center">
                {success.alreadyMember
                  ? "You're already a member of this server."
                  : "You've successfully joined the server."}
              </DialogDescription>
            </DialogHeader>

            <div className="pt-4">
              <button
                onClick={() => {
                  handleClose();
                  router.push(`/servers?serverId=${success.serverId}`);
                }}
                className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors"
              >
                Go to Server
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
