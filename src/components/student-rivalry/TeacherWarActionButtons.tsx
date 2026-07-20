"use client";

import { useState } from "react";
import { acceptWarNomination, declineWarNomination } from "@/actions/student-rivalry.actions";

export default function TeacherWarActionButtons({
  boutId,
  action,
}: {
  boutId: string;
  action: "accept" | "decline";
}) {
  const [loading, setLoading] = useState(false);

  async function handleAction() {
    setLoading(true);
    try {
      if (action === "accept") {
        await acceptWarNomination(boutId);
      } else {
        await declineWarNomination(boutId);
      }
    } catch (e: any) {
      alert(e.message || "Failed to process action");
    } finally {
      setLoading(false);
    }
  }

  if (action === "accept") {
    return (
      <button
        onClick={handleAction}
        disabled={loading}
        className="flex-1 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 font-bold py-2.5 rounded-xl border border-emerald-500/30 transition-colors disabled:opacity-50"
      >
        {loading ? "Accepting..." : "Accept Nomination"}
      </button>
    );
  }

  return (
    <button
      onClick={handleAction}
      disabled={loading}
      className="flex-1 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold py-2.5 rounded-xl border border-red-500/30 transition-colors disabled:opacity-50"
    >
      {loading ? "Declining..." : "Decline"}
    </button>
  );
}
