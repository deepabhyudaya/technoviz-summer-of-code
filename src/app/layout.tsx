import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ThemeProvider } from "@/components/theme-provider";

import { GlobalNotificationProvider } from "@/components/GlobalNotification";
import { getEquippedColors } from "@/actions/color-shop.actions";
import { auth } from "@clerk/nextjs/server";
import { StatusBarHandler } from "@/components/StatusBarHandler";
import { getActiveEventThemeForUser } from "@/lib/event-themes";
import { EventThemeProvider } from "@/components/EventThemeProvider";
import { ThemePersist } from "@/components/ThemePersist";

const inter = Inter({ subsets: ["latin"] });

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "gecX",
  description: "College Management System",
  manifest: "/manifest.json",
  themeColor: "#313338",
  icons: [
    { rel: "icon", url: "/logo.png" },
    { rel: "apple-touch-icon", url: "/logo.png", sizes: "180x180" },
  ],
  appleWebApp: {
    capable: true,
    title: "gecX",
    statusBarStyle: "black-translucent",
  },
  other: {
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "mobile-web-app-capable": "yes",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = auth();
  let htmlThemeStyle: React.CSSProperties = {};   // CSS vars — go on <html>
  let bodyBgImage: string | undefined;             // gradient backgroundImage — goes on <body>
  let themeMode: "light" | "dark" | undefined = undefined;
  let eventThemeActive = false;                    // tracks if an event theme is currently active

  if (userId) {
    try {
      // Check active event theme first (overrides user theme)
      const eventThemeData = await getActiveEventThemeForUser(userId);
      if (eventThemeData && eventThemeData.theme && !eventThemeData.state.revertedAt) {
        eventThemeActive = true;
        const parsed = JSON.parse(eventThemeData.theme.themeVars) as Record<string, string>;
        // Event theme background image is stored in its own DB field, not themeVars
        const rawBgImage = eventThemeData.theme.backgroundImage;
        // Wrap raw URL in url() if it doesn't already look like a CSS value
        bodyBgImage = rawBgImage
          ? (rawBgImage.startsWith("linear-gradient") || rawBgImage.startsWith("radial-gradient") || rawBgImage.startsWith("url(")
            ? rawBgImage
            : `url(${rawBgImage})`)
          : undefined;
        htmlThemeStyle = {
          ...parsed,
          "--event-panel-opacity": String(eventThemeData.theme.panelBgOpacity ?? 0.92),
        } as React.CSSProperties;

        const bg = parsed["--background"];
        if (bg) {
          const match = bg.match(/(\d+(?:\.\d+)?)%/g);
          if (match && match.length >= 2) {
            const lightness = parseFloat(match[1]);
            themeMode = lightness > 50 ? "light" : "dark";
          }
        }
      } else {
        // Fall back to user's equipped theme
        const colors = await getEquippedColors(userId);
        if (colors?.themeVars) {
          const parsed = JSON.parse(colors.themeVars) as Record<string, string>;

          // Separate backgroundImage (gradient) from CSS custom properties
          const { backgroundImage, ...cssVars } = parsed;
          bodyBgImage = backgroundImage as string | undefined;
          htmlThemeStyle = cssVars as React.CSSProperties;

          // Determine light vs dark from background lightness
          const bg = cssVars["--background"];
          if (bg) {
            const match = bg.match(/(\d+(?:\.\d+)?)%/g);
            if (match && match.length >= 2) {
              const lightness = parseFloat(match[1]); // second % = lightness in HSL
              themeMode = lightness > 50 ? "light" : "dark";
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to load user theme", e);
    }
  }

  return (
    <ClerkProvider>
      {/* Theme CSS vars live on <html> so they have higher specificity than html.dark class rules */}
      <html
        lang="en"
        suppressHydrationWarning
        data-event-theme={eventThemeActive ? "active" : undefined}
        style={{
          ...htmlThemeStyle,
          colorScheme: themeMode ?? "dark",
        }}
      >
        <head>
          {/* Open TCP+TLS connections to image CDNs in parallel with HTML parse
              so the first <Image> render doesn't pay DNS/handshake cost. */}
          <link rel="preconnect" href="https://img.clerk.com" crossOrigin="anonymous" />
          <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
          <link rel="dns-prefetch" href="https://api.dicebear.com" />
          <link rel="dns-prefetch" href="https://cdn.pfps.gg" />
          <link rel="dns-prefetch" href="https://images.pexels.com" />
        </head>
        <body
          className={inter.className}
          style={bodyBgImage ? {
            backgroundImage: bodyBgImage,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed",
          } : undefined}
        >
          <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme={themeMode} disableTransitionOnChange>
            <StatusBarHandler />
            {/* Persist the equipped theme to localStorage so the login page can restore it */}
            {userId && (
              <ThemePersist
                vars={htmlThemeStyle as Record<string, string>}
                bodyBgImage={bodyBgImage}
                mode={themeMode ?? "dark"}
                hasTheme={Object.keys(htmlThemeStyle).length > 0}
              />
            )}
            <GlobalNotificationProvider>
              <EventThemeProvider hasActiveEvent={eventThemeActive}>
                {children}
              </EventThemeProvider>
            </GlobalNotificationProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
