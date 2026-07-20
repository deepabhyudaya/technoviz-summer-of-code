import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getGecXSettings, updateGecXSettings, resetGecXSettingsToDefaults } from "@/actions/gecx-settings.actions";
import GecXSettingsClient from "./GecXSettingsClient";

export const metadata = {
  title: "gecX Settings | gecX",
  description: "Configure gecX token earning rates and settings.",
};

const GecXSettingsPage = async () => {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin") {
    redirect("/unauthorized");
  }

  const settings = await getGecXSettings();

  return <GecXSettingsClient initialSettings={settings} />;
};

export default GecXSettingsPage;
