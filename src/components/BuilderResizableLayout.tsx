"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export function BuilderResizableLayout({
  left,
  right,
  defaultLayout,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultLayout?: number[];
}) {
  const onLayout = (sizes: number[]) => {
    document.cookie = `react-resizable-panels:builder-layout=${JSON.stringify(sizes)}; path=/; max-age=31536000`;
  };

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="flex flex-col lg:flex-row"
      onLayout={onLayout}
    >
      <ResizablePanel
        defaultSize={defaultLayout?.[0] ?? 33}
        minSize={22}
        className="flex flex-col gap-5 pr-0 lg:pr-3"
      >
        {left}
      </ResizablePanel>

      <ResizableHandle className="hidden lg:flex mx-1" />

      <ResizablePanel
        defaultSize={defaultLayout?.[1] ?? 67}
        minSize={40}
        className="flex flex-col gap-5 pl-0 lg:pl-3"
      >
        {right}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
