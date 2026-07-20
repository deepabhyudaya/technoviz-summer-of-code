"use client";

import dynamic from "next/dynamic";
import type { SyntaxHighlighterProps } from "react-syntax-highlighter";

const SyntaxHighlighter = dynamic(
  () => import("react-syntax-highlighter").then((mod) => mod.Prism),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg bg-muted animate-pulse h-24" />
    ),
  }
) as React.ComponentType<SyntaxHighlighterProps>;

export default SyntaxHighlighter;
