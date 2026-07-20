"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { getAiCourseRecommendations, getAiAttendanceSummary, generateTeacherQuestion, generateDuelQuestions } from "@/actions/ai.actions";

interface AiStubCardProps {
  title: string;
  description: string;
  feature: "course-recommendations" | "attendance-summary" | "question-generator" | "duel-questions";
}

const featureActions: Record<AiStubCardProps["feature"], () => Promise<{ success: boolean; error?: string }>> = {
  "course-recommendations": getAiCourseRecommendations,
  "attendance-summary": () => getAiAttendanceSummary(0),
  "question-generator": () => generateTeacherQuestion("", "single_choice"),
  "duel-questions": () => generateDuelQuestions("General Knowledge", 5),
};

export function AiStubCard({ title, description, feature }: AiStubCardProps) {
  const [loading, setLoading] = useState(false);
  const action = featureActions[feature];

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await action();
      if (!result.success) {
        toast.info(result.error || "This AI feature is coming soon.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles size={14} className="text-violet-400" />
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleClick}
          disabled={loading}
          className="text-xs border-violet-500/30 text-violet-300 hover:bg-violet-500/10 hover:text-violet-200 shrink-0"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : "Try AI"}
        </Button>
      </div>
    </div>
  );
}
