import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAvatarShopItems, updateAvatarPrice, toggleAvatarItemStatus, resetAvatarPricesToDefaults } from "@/actions/gecx-settings.actions";
import AvatarPricingClient from "./AvatarPricingClient";

export const metadata = {
  title: "Avatar Pricing | gecX",
  description: "Manage avatar shop pricing and availability.",
};

const AvatarPricingPage = async () => {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin") {
    redirect("/unauthorized");
  }

  const shopItems = await getAvatarShopItems();

  return <AvatarPricingClient initialItems={shopItems} />;
};

export default AvatarPricingPage;
