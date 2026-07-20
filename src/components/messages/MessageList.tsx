"use client";

import { useRef, useEffect, forwardRef } from "react";
import { Virtuoso } from "react-virtuoso";

interface MessageListProps {
  messages: any[];
  renderMessage: (msg: any, index: number) => React.ReactNode;
  scrollToBottom?: boolean;
}

const VirtuosoList = forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
  function VirtuosoList(props, ref) {
    return (
      <div
        ref={ref}
        {...props}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-background flex flex-col no-scrollbar"
      />
    );
  }
);

export default function MessageList({
  messages,
  renderMessage,
  scrollToBottom = true,
}: MessageListProps) {
  const virtuosoRef = useRef<any>(null);

  useEffect(() => {
    if (scrollToBottom && messages.length > 0 && virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({ index: messages.length - 1, behavior: "auto" });
    }
  }, [messages.length, scrollToBottom]);

  if (messages.length <= 20) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background flex flex-col no-scrollbar">
        {messages.map((msg, index) => (
          <div key={msg.id ?? index}>{renderMessage(msg, index)}</div>
        ))}
      </div>
    );
  }

  return (
    <Virtuoso
      ref={virtuosoRef}
      style={{ flex: 1 }}
      data={messages}
      components={{ List: VirtuosoList }}
      itemContent={(index, msg) => (
        <div className="py-1">{renderMessage(msg, index)}</div>
      )}
      followOutput="auto"
      initialTopMostItemIndex={messages.length - 1}
    />
  );
}
