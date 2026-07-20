"use client";

import { useState } from "react";
import { proposeRivalry } from "@/actions/rivalry.actions";
import { useRouter } from "next/navigation";

type ClassOption = {
  id: number;
  name: string;
  capacity: number;
  branchCode?: string | null;
  grade: { level: number };
  college?: { id: string; name: string; shortName: string | null } | null;
};

type Props = {
  myClassId: number;
  myClassName: string;
  availableClasses: ClassOption[];
};

export default function ProposeRivalryForm({ myClassId, myClassName, availableClasses }: Props) {
  const [targetClassId, setTargetClassId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetClassId) return;
    setSubmitting(true);
    setError(null);
    try {
      await proposeRivalry({ classAId: myClassId, classBId: targetClassId, proposalNote: note });
      setSuccess(true);
      setTimeout(() => router.refresh(), 1000);
    } catch (err: any) {
      setError(err?.message || "Failed to submit proposal");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-2xl p-8 text-center space-y-3">
        <div className="text-4xl">⚔️</div>
        <h3 className="font-bold text-lg text-emerald-400">Challenge Issued!</h3>
        <p className="text-sm text-muted-foreground">
          Your rivalry proposal has been sent to admin for review. It will auto-expire in 7 days if not reviewed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
          Your Branch (Challenger)
        </label>
        <div className="bg-muted/30 border border-border rounded-xl px-4 py-3 font-bold text-blue-400">
          {myClassName}
        </div>
      </div>

      <div className="flex items-center justify-center text-2xl font-black text-muted-foreground">VS</div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
          Challenge Branch *
        </label>
        <select
          value={targetClassId ?? ""}
          onChange={(e) => setTargetClassId(Number(e.target.value) || null)}
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          required
        >
          <option value="">Select opponent branch…</option>
          {availableClasses.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.college?.shortName ? `[${cls.college.shortName}] ` : cls.college?.name ? `[${cls.college.name}] ` : ""}
              {cls.name}
              {cls.branchCode ? ` · ${cls.branchCode}` : ""} (Year {cls.grade?.level ?? "?"}, {cls.capacity} seats)
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
          War Declaration (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder="Write your challenge. Make it legendary."
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="text-xs text-muted-foreground text-right mt-1">{note.length}/280</div>
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!targetClassId || submitting}
        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-lg"
      >
        {submitting ? "Issuing Challenge…" : "⚔️ Propose the Rivalry"}
      </button>

      <p className="text-xs text-muted-foreground text-center">
        Admin must approve within 7 days · Both CRs must then confirm · You can propose once per month
      </p>
    </form>
  );
}
