"use client";

import { useState } from "react";
import { proposeStudentRivalry } from "@/actions/student-rivalry.actions";
import { useRouter } from "next/navigation";
import WarTypePicker from "./WarTypePicker";

type StudentOption = {
  id: string;
  name: string;
  surname: string;
  username: string;
  img?: string | null;
  class?: { name: string } | null;
};

type Props = {
  students: StudentOption[];
  teachers: { id: string; name: string; surname: string }[];
};

export default function ProposeStudentWarForm({ students, teachers }: Props) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [warTypeId, setWarTypeId] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetId || !warTypeId) return;
    setSubmitting(true);
    setError(null);
    try {
      await proposeStudentRivalry({
        studentBId: targetId,
        proposalNote: note,
        warTypeId: warTypeId === "AUTO_RANDOM" ? null : warTypeId,
        teacherId,
        isAutoRandom: warTypeId === "AUTO_RANDOM",
      });
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
          Your duel proposal has been sent to admin for review. It will auto-expire in 7 days if not reviewed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
          Choose Opponent *
        </label>
        <select
          value={targetId ?? ""}
          onChange={(e) => setTargetId(e.target.value || null)}
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          required
        >
          <option value="">Select a student to challenge…</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.surname} {s.class?.name ? `· ${s.class.name}` : ""} (@{s.username})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
          Select War Type *
        </label>
        <WarTypePicker
          selectedTypeId={warTypeId}
          onSelect={setWarTypeId}
          teachers={teachers}
          selectedTeacherId={teacherId}
          onSelectTeacher={setTeacherId}
        />
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
        disabled={!targetId || !warTypeId || submitting}
        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-lg"
      >
        {submitting ? "Issuing Challenge…" : "⚔️ Declare War"}
      </button>

      <p className="text-xs text-muted-foreground text-center">
        Admin must approve within 7 days · Opponent must then accept · You can propose once per month
      </p>
    </form>
  );
}
