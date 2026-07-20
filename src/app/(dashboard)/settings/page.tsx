import { Metadata } from "next";
import SettingsClient from "./SettingsClient";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserAccessCode } from "@/actions/message.actions";

export const metadata: Metadata = {
  title: "Settings | gecX",
  description: "Manage your gecX account settings.",
};

export default async function SettingsPage() {
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role ?? "user";
  const clerkUser = await currentUser();

  const accessCode = await getUserAccessCode();

  const userInfo = {
    fullName: clerkUser?.fullName ?? "",
    email: clerkUser?.emailAddresses?.[0]?.emailAddress ?? "",
    username: clerkUser?.username ?? "",
    avatar: clerkUser?.imageUrl ?? "/noAvatar.png",
    role,
    accessCode,
  };

  return <SettingsClient userInfo={userInfo} />;
}
