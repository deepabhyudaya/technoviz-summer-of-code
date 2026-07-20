import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getEventThemes } from "@/actions/event-theme.actions";
import EventThemesClient from "./EventThemesClient";

export const metadata = {
  title: "Event Themes | gecX",
  description: "Create and manage seasonal event themes for all users.",
};

const EventThemesPage = async () => {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();
  if (role !== "admin") redirect("/unauthorized");

  const themes = await getEventThemes();

  return <EventThemesClient initialThemes={themes} />;
};

export default EventThemesPage;
