"use server";

import { auth } from "@clerk/nextjs/server";
import { DICEBEAR_CATALOG } from "@/lib/shop-catalog";
import { getOrbAvatarUrl, isOrbStyle } from "@/lib/orb-avatars";

// All exports in a "use server" file MUST be async functions

// DiceBear API uses kebab-case style slugs directly in the URL path (no camelCase conversion)
// randomizeIds=true prevents SVG internal ID collisions when multiple avatars are on the same page
export async function generateWorkingAvatarUrl(
  style: string,
  seed: string,
  size: number = 128
): Promise<string> {
  if (isOrbStyle(style)) {
    return getOrbAvatarUrl(seed, size);
  }
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=${size}&randomizeIds=true`;
}

export async function getUserWorkingBalance(userId: string) {
  if (!userId) throw new Error("Unauthorized");
  return { balance: 1000, totalEarned: 0, totalSpent: 0 };
}

export async function purchaseWorkingAvatar(style: string, cost: number) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const currentBalance = await getUserWorkingBalance(userId);
  if (currentBalance.balance < cost) throw new Error("Insufficient gecX tokens");

  // For now, simulate purchase and return success with ownership info
  // In production, this would create avatar ownership records
  try {
    return {
      success: true,
      avatar: { style, cost },
      remainingBalance: { balance: currentBalance.balance - cost },
      owned: true, // Mark as owned
    };
  } catch (error) {
    console.error("Purchase error:", error);
    throw new Error("Failed to purchase avatar");
  }
}

export async function equipWorkingAvatar(style: string, profileType: "academic" | "community") {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  // For now, just simulate equipping and return success
  // In production, this would update database records
  try {
    return {
      success: true,
      profileType,
      style,
      message: `Avatar equipped for ${profileType} profile`,
    };
  } catch (error) {
    console.error("Equip error:", error);
    throw new Error("Failed to equip avatar");
  }
}

export async function getWorkingShopData() {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const balance = await getUserWorkingBalance(userId);

  // Each catalog item has its own preset seed for a unique, consistent look
  const items = await Promise.all(
    DICEBEAR_CATALOG.map(async (avatar) => ({
      id: avatar.id,
      style: avatar.style,
      seed: avatar.seed,
      name: avatar.name,
      category: avatar.category,
      cost: avatar.cost,
      previewUrl: await generateWorkingAvatarUrl(avatar.style, avatar.seed, 128),
      owned: false,
      equippedAcademic: false,
      equippedCommunity: false,
    }))
  );

  return {
    items,
    balance,
    equipped: {
      academicStyle: undefined as string | undefined,
      academicSeed: userId,
      communityStyle: undefined as string | undefined,
      communitySeed: userId,
    },
  };
}
