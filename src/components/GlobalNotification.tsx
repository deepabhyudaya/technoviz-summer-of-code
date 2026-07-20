"use client";

import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "next-themes";

/**
 * Provides a ToastContainer for app-wide toast notifications.
 * Individual features call toast() directly when they need to surface an alert.
 * Real-time sidebar badge updates are handled by the polling loop inside SidebarInner.
 */
export function GlobalNotificationProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <>
      {children}
      <ToastContainer
        theme={theme === "dark" ? "dark" : "light"}
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        draggable
      />
    </>
  );
}
