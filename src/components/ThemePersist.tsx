"use client";

import { useEffect } from "react";

interface Props {
  /** All CSS custom-property vars from the equipped theme (e.g. --primary, --background …) */
  vars: Record<string, string>;
  /** If the theme includes a gradient background image, it lives here */
  bodyBgImage?: string;
  /** Resolved light/dark mode from the theme's --background lightness */
  mode: "light" | "dark";
  /** Whether a real custom theme is active; when false we CLEAR the saved key */
  hasTheme: boolean;
}

/**
 * Runs once on mount and either saves the current server-resolved theme to
 * localStorage ("gecx_equipped_theme") or clears it if the user has no custom
 * theme equipped.  This ensures the *login page* (which can't load the theme
 * from the DB because the user is unauthenticated) can still restore and
 * display the user's colours.
 */
export function ThemePersist({ vars, bodyBgImage, mode, hasTheme }: Props) {
  useEffect(() => {
    try {
      if (!hasTheme) {
        localStorage.removeItem("gecx_equipped_theme");
        return;
      }
      const payload = {
        vars: bodyBgImage ? { ...vars, backgroundImage: bodyBgImage } : vars,
        mode,
      };
      localStorage.setItem("gecx_equipped_theme", JSON.stringify(payload));
    } catch {
      // Silently ignore — e.g. private browsing with storage disabled.
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
