"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Tiny dependency-free top progress bar (no nprogress).
// - Listens for Link clicks and form-submission to start the bar early.
// - Completes when the URL (pathname + search) actually changes.
// - Stays out of the way: ~2px tall, themed to --primary.
// Trade-off: we can't know exactly when a soft-nav finishes streaming, so we
// finish on URL change, which is the moment the new segment is committed —
// matching what the user perceives.
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastUrlRef = useRef<string>("");

  // Clear any in-flight timers on unmount or new transition.
  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  // Start the progress animation.
  const start = () => {
    clearTimers();
    setVisible(true);
    setProgress(0);
    // Animate up to 80% over ~500ms; the remaining 20% completes on URL change.
    timersRef.current.push(setTimeout(() => setProgress(20), 10));
    timersRef.current.push(setTimeout(() => setProgress(50), 150));
    timersRef.current.push(setTimeout(() => setProgress(75), 350));
    timersRef.current.push(setTimeout(() => setProgress(85), 700));
  };

  // Listen for clicks on internal anchors — Next/Link renders a real <a>.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Ignore modifier clicks, middle-click, etc.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      // Only same-origin internal links; ignore hash-only and external.
      if (href.startsWith("http") && !href.startsWith(window.location.origin)) return;
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (anchor.target && anchor.target !== "_self") return;
      start();
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // Complete the bar whenever the URL actually changes.
  useEffect(() => {
    const url = pathname + "?" + (searchParams?.toString() ?? "");
    if (lastUrlRef.current && lastUrlRef.current !== url) {
      clearTimers();
      setProgress(100);
      timersRef.current.push(
        setTimeout(() => {
          setVisible(false);
          setProgress(0);
        }, 250)
      );
    }
    lastUrlRef.current = url;
    return clearTimers;
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden
      className="fixed left-0 top-0 z-[9999] h-[2px] w-full pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease-out",
      }}
    >
      <div
        className="h-full bg-primary"
        style={{
          width: `${progress}%`,
          transition: "width 250ms cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: "0 0 8px hsl(var(--primary) / 0.5)",
        }}
      />
    </div>
  );
}
