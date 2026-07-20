import Navbar from "@/components/Navbar";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardLayoutClient } from "@/components/DashboardLayoutClient";
import { getActiveEventThemeForUser } from "@/lib/event-themes";
import { auth } from "@clerk/nextjs/server";

import { cookies } from "next/headers";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = cookies();
  const layout = cookieStore.get("react-resizable-panels:layout");
  let defaultLayout = undefined;
  if (layout) {
    try {
      defaultLayout = JSON.parse(layout.value);
    } catch (e) {}
  }

  const { userId } = auth();
  let eventTheme = null;
  let bannerDismissedAt = null;
  if (userId) {
    try {
      const data = await getActiveEventThemeForUser(userId);
      if (data && !data.state.revertedAt) {
        eventTheme = data.theme;
        bannerDismissedAt = data.state.bannerDismissedAt;
      }
    } catch (e) {
      console.error("[DashboardLayout] Failed to load event theme:", e);
    }
  }

  return (
    <DashboardLayoutClient
      sidebar={<AppSidebar />}
      topBar={<Navbar />}
      defaultLayout={defaultLayout}
      eventTheme={eventTheme}
      bannerDismissedAt={bannerDismissedAt}
    >
      {children}
    </DashboardLayoutClient>
  );
}
