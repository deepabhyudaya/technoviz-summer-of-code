"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateAiAnswer } from "@/actions/ai.actions";
import { toast } from "react-toastify";

interface AiAnswerButtonProps {
  postId: string;
  hasAiAnswer?: boolean;
}

export function AiAnswerButton({ postId, hasAiAnswer }: AiAnswerButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await generateAiAnswer(postId);
      if (result.success) {
        toast.success("AI answer generated!");
        router.refresh();
      } else {
        toast.error(result.error || "AI could not answer this question.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (hasAiAnswer) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-1.5 text-xs opacity-70">
        <Sparkles size={14} />
        AI answered
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className="gap-1.5 text-xs bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 hover:from-violet-500/20 hover:to-fuchsia-500/20 border-violet-500/30"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
      Answer with AI
    </Button>
  );
}
