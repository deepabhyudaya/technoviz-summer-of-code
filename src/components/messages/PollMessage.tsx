"use client";

import { useMemo, useState, memo } from "react";
import { useRouter } from "next/navigation";
import { voteOnPoll } from "@/actions/message.actions";

type Poll = {
  id: number;
  question: string;
  options: { id: number; text: string }[];
  votes: { id: number; optionId: number; userId: string }[];
};

function PollMessageComponent({
  poll,
  currentUserId,
  isOwnMessage = false,
  getVoterLabel,
}: {
  poll: Poll;
  currentUserId: string;
  isOwnMessage?: boolean;
  getVoterLabel?: (userId: string) => string;
}) {
  const router = useRouter();
  const [votingOptionId, setVotingOptionId] = useState<number | null>(null);

  const myVote = useMemo(
    () => poll.votes.find((v) => v.userId === currentUserId),
    [poll.votes, currentUserId]
  );

  const counts = useMemo(() => {
    const map = new Map<number, number>();
    for (const v of poll.votes) {
      map.set(v.optionId, (map.get(v.optionId) || 0) + 1);
    }
    return map;
  }, [poll.votes]);

  const totalVotes = poll.votes.length;

  const vote = async (optionId: number) => {
    setVotingOptionId(optionId);
    try {
      await voteOnPoll(poll.id, optionId);
      router.refresh();
    } finally {
      setVotingOptionId(null);
    }
  };

  return (
    <div className="w-full">
      <div className={`text-[12px] font-semibold mb-2 ${isOwnMessage ? "text-background" : "text-foreground"}`}>
        {poll.question}
      </div>
      <div className="space-y-2">
        {poll.options.map((opt) => {
          const c = counts.get(opt.id) || 0;
          const pct = totalVotes === 0 ? 0 : Math.round((c / totalVotes) * 100);
          const selected = myVote?.optionId === opt.id;
          const disabled = votingOptionId !== null;
          const voters = poll.votes
            .filter((v) => v.optionId === opt.id)
            .map((v) => (getVoterLabel ? getVoterLabel(v.userId) : v.userId));

          return (
            <button
              key={opt.id}
              onClick={() => vote(opt.id)}
              disabled={disabled}
              className={`group relative w-full text-left rounded-md border transition-colors px-3 py-2 ${
                isOwnMessage
                  ? "border-background/20 bg-background/10 hover:bg-background/20"
                  : "border-border bg-background hover:bg-muted"
              } ${
                selected ? "ring-2 ring-blue-500/40 border-blue-500/30" : ""
              } disabled:opacity-60`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`text-[13px] font-medium ${isOwnMessage ? "text-background" : "text-foreground"}`}>
                  {opt.text}
                </span>
                <span className={`text-[11px] font-mono ${isOwnMessage ? "text-background/80" : "text-muted-foreground"}`}>
                  {c}  {pct}%
                </span>
              </div>
              <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${isOwnMessage ? "bg-background/25" : "bg-muted"}`}>
                <div
                  className="h-full bg-blue-500/70"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {voters.length > 0 && (
                <div className="absolute left-2 top-full mt-1 z-20 hidden group-hover:block rounded-md border border-border bg-background shadow-lg px-2 py-1 min-w-[140px]">
                  <p className="text-[10px] text-muted-foreground font-semibold mb-1">Voters</p>
                  <div className="space-y-0.5">
                    {voters.map((name, idx) => (
                      <p key={`${name}-${idx}`} className="text-[11px] text-foreground line-clamp-1">
                        {name}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className={`mt-2 text-[11px] ${isOwnMessage ? "text-background/80" : "text-muted-foreground"}`}>
        {totalVotes} vote{totalVotes === 1 ? "" : "s"}
      </div>
    </div>
  );
}

export default memo(PollMessageComponent);

