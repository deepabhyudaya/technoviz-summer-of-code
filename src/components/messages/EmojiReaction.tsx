"use client";

import React from "react";

interface EmojiReactionProps {
  emoji: string;
  emojiMap?: Record<string, string>; // name -> imageUrl
  className?: string;
}

/**
 * Renders an emoji reaction.
 * If the emoji matches :name: pattern and exists in emojiMap, renders as image.
 * Otherwise renders as text (for standard unicode emojis).
 */ 
export default function EmojiReaction({ emoji, emojiMap = {}, className = "" }: EmojiReactionProps) {
  // Check if emoji matches :name: pattern
  const match = emoji.match(/^:([a-z0-9_]{1,64}):$/);
  
  if (match) {
    const name = match[1];
    const imageUrl = emojiMap[name];
    
    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt={emoji}
          title={emoji}
          className={`inline-block w-4 h-4 object-contain ${className}`}
          loading="lazy"
        />
      );
    }
  }
  
  // Fallback to text for unicode emojis or unknown custom emojis
  return <span className={className}>{emoji}</span>;
}
