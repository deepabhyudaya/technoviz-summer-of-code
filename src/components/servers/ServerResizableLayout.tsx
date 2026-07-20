"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

interface ServerResizableLayoutProps {
  /** The channels sidebar panel (ServerChannelList) */
  channelList: React.ReactNode;
  /** The main chat/placeholder area */
  chat: React.ReactNode;
  /** Persisted sizes from cookie, [channelList%, chat%] */
  defaultLayout?: number[];
}

export function ServerResizableLayout({
  channelList,
  chat,
  defaultLayout,
}: ServerResizableLayoutProps) {
  const onLayout = (sizes: number[]) => {
    // Only persist on desktop
    if (typeof window !== "undefined" && window.innerWidth < 768) return;
    document.cookie = `react-resizable-panels:server-layout=${JSON.stringify(sizes)}; path=/; max-age=31536000`;
  };

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="flex-1 min-w-0 h-full overflow-hidden"
      onLayout={onLayout}
    >
      {/* Channels panel */}
      <ResizablePanel
        defaultSize={defaultLayout?.[0] ?? 20}
        minSize={14}
        maxSize={35}
        className="flex flex-col h-full overflow-hidden"
      >
        {channelList}
      </ResizablePanel>

      <ResizableHandle withHandle className="hidden md:flex" />

      {/* Chat / placeholder panel */}
      <ResizablePanel
        defaultSize={defaultLayout?.[1] ?? 80}
        minSize={50}
        className="flex flex-col h-full min-w-0 overflow-hidden"
      >
        {chat}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
