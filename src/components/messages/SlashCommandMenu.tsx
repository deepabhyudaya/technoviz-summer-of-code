"use client";

import { useMemo } from "react";
import { BarChart3, Ticket, HelpCircle, Smile, Shield, UserPlus } from "lucide-react";

export type SlashCommand = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  icon: React.ReactNode;
  onSelect: () => void;
};

export default function SlashCommandMenu({
  query,
  commands,
}: {
  query: string;
  commands: SlashCommand[];
}) {
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return commands;
    return commands.filter((c) => {
      const hay = `${c.title} ${c.description} ${c.keywords.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [commands, query]);

  if (filtered.length === 0) return null;

  return (
    <div className="w-full rounded-md border border-border bg-background shadow-xl overflow-hidden">
      <div className="px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border">
        Commands
      </div>
      <div className="max-h-56 overflow-y-auto no-scrollbar">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={c.onSelect}
            className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-start gap-3"
          >
            <div className="mt-0.5 text-muted-foreground">{c.icon}</div>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-foreground">{c.title}</div>
              <div className="text-[11px] text-muted-foreground line-clamp-1">{c.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export const defaultIcons = {
  poll: <BarChart3 className="size-4" />,
  ticket: <Ticket className="size-4" />,
  help: <HelpCircle className="size-4" />,
  reactionrole: <Smile className="size-4" />,
  role: <Shield className="size-4" />,
  assign: <UserPlus className="size-4" />,
};

