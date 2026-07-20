"use client";

import { useState } from "react";
import { Sparkles, Loader2, Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateAssignmentHint } from "@/actions/ai.actions";
import { toast } from "react-toastify";

interface AiHintButtonProps {
  questionTitle: string;
  questionDescription?: string | null;
}

export function AiHintButton({ questionTitle, questionDescription }: AiHintButtonProps) {
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await generateAssignmentHint(questionTitle, questionDescription);
      if (result.success && result.hint) {
        setHint(result.hint);
        setOpen(true);
      } else {
        toast.error(result.error || "Could not generate hint.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const closeHint = () => {
    setOpen(false);
    setHint(null);
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={loading}
        className="gap-1.5 text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 px-2 h-7"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
        AI hint
      </Button>

      {open && hint && (
        <div className="relative rounded-lg border border-violet-500/30 bg-violet-500/10 p-3 pr-7">
          <button
            type="button"
            onClick={closeHint}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
          <div className="flex items-start gap-2">
            <Lightbulb size={16} className="text-violet-400 mt-0.5 shrink-0" />
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{hint}</p>
          </div>
        </div>
      )}
    </div>
  );
}
