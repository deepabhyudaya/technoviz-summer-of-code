"use client";

import { PanelLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface SidebarToggleButtonProps {
  collapsed?: boolean;
  onToggle?: () => void;
  onMobileOpen?: () => void;
}

export function SidebarToggleButton({
  collapsed = false,
  onToggle,
  onMobileOpen,
}: SidebarToggleButtonProps) {
  function handleClick() {
    if (window.innerWidth < 768) {
      onMobileOpen?.();
    } else {
      onToggle?.();
    }
  }

  return (
    <button
      onClick={handleClick}
      className="p-2 ml-4 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
      aria-label="Toggle sidebar"
    >
      {collapsed ? (
        <PanelLeftOpen size={18} strokeWidth={1.8} />
      ) : (
        <PanelLeftClose size={18} strokeWidth={1.8} />
      )}
    </button>
  );
}
