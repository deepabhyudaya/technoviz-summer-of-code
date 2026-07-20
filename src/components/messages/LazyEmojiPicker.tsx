"use client";

import dynamic from "next/dynamic";
import type { EmojiClickData, Theme } from "emoji-picker-react";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <div className="w-[320px] h-[300px] bg-muted animate-pulse rounded-lg" />
  ),
});

export { Theme };
export type { EmojiClickData };
export default EmojiPicker;
