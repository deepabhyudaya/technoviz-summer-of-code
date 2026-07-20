"use client";

import { useEffect, useState } from "react";

interface HydrationWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  delay?: number;
}

export function HydrationWrapper({
  children,
  fallback = null,
  delay = 0
}: HydrationWrapperProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  if (!isHydrated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}