"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

// ==================== SERVER EMOJIS ====================

export async function getServerEmojis(serverId: string) {
  const [emojis, stickers, server] = await Promise.all([
    prisma.serverEmoji.findMany({
      where: { serverId },
      orderBy: { name: "asc" },
      include: { server: { select: { name: true } } },
    }),
    prisma.serverSticker.findMany({
      where: { serverId },
      orderBy: { name: "asc" },
      include: { server: { select: { name: true } } },
    }),
    prisma.server.findUnique({ where: { id: serverId }, select: { name: true } }),
  ]);
  return {
    emojis: emojis.map((e) => ({
      ...e,
      groupName: e.server?.name || server?.name || "Server",
      usable: true,
    })),
    stickers: stickers.map((s) => ({
      ...s,
      groupName: s.server?.name || server?.name || "Server",
      usable: true,
    })),
  };
}

// Get all emojis/stickers from all servers the user has joined (for DMs, groups, etc.)
export async function getAllUserServerEmojisAndStickers() {
  const { userId } = auth();
  if (!userId) return { emojis: [], stickers: [] };

  // Get all server IDs the user is a member of
  const memberships = await prisma.serverMember.findMany({
    where: { userId },
    select: { serverId: true },
  });

  const serverIds = memberships.map((m) => m.serverId);

  if (serverIds.length === 0) {
    return { emojis: [], stickers: [] };
  }

  // Get all emojis and stickers from those servers
  const [emojis, stickers, servers] = await Promise.all([
    prisma.serverEmoji.findMany({
      where: { serverId: { in: serverIds } },
      orderBy: { name: "asc" },
      include: { server: { select: { name: true } } },
    }),
    prisma.serverSticker.findMany({
      where: { serverId: { in: serverIds } },
      orderBy: { name: "asc" },
      include: { server: { select: { name: true } } },
    }),
    prisma.server.findMany({
      where: { id: { in: serverIds } },
      select: { id: true, name: true },
    }),
  ]);

  const serverNameMap = new Map(servers.map((s) => [s.id, s.name]));

  return {
    emojis: emojis.map((e) => ({
      ...e,
      groupName: e.server?.name || serverNameMap.get(e.serverId) || "Server",
      usable: true,
    })),
    stickers: stickers.map((s) => ({
      ...s,
      groupName: s.server?.name || serverNameMap.get(s.serverId) || "Server",
      usable: true,
    })),
  };
}

// Combined data for emoji picker: server emojis + global packs with ownership info
export async function getAllEmojiPickerData() {
  const { userId } = auth();
  if (!userId) return { emojis: [], stickers: [] };

  const [serverData, allGlobalEmojis, allGlobalStickers, ownedEmojiIds, ownedStickerIds] = await Promise.all([
    getAllUserServerEmojisAndStickers(),
    prisma.globalEmoji.findMany({ where: { isActive: true }, orderBy: { packId: "asc" } }),
    prisma.globalSticker.findMany({ where: { isActive: true }, orderBy: { packId: "asc" } }),
    prisma.userOwnedGlobalEmoji.findMany({ where: { userId }, select: { emojiId: true } }),
    prisma.userOwnedGlobalSticker.findMany({ where: { userId }, select: { stickerId: true } }),
  ]);

  const ownedEmojiIdSet = new Set(ownedEmojiIds.map((o) => o.emojiId));
  const ownedStickerIdSet = new Set(ownedStickerIds.map((o) => o.stickerId));

  const globalEmojis = allGlobalEmojis.map((e) => ({
    ...e,
    groupName: e.packId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    usable: ownedEmojiIdSet.has(e.id),
  }));

  const globalStickers = allGlobalStickers.map((s) => ({
    ...s,
    groupName: s.packId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    usable: ownedStickerIdSet.has(s.id),
  }));

  return {
    emojis: [...serverData.emojis, ...globalEmojis],
    stickers: [...serverData.stickers, ...globalStickers],
  };
}

// Get all active global emojis for rendering (no ownership check)
export async function getAllGlobalEmojis() {
  const [emojis, stickers] = await Promise.all([
    prisma.globalEmoji.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.globalSticker.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  return { emojis, stickers };
}

// Get ALL emojis/stickers from every source for rendering messages (no ownership/membership check).
// This ensures any user can SEE custom emojis in messages even if they haven't purchased a pack.
export async function getAllEmojisForRendering() {
  const [serverEmojis, serverStickers, globalEmojis, globalStickers] = await Promise.all([
    prisma.serverEmoji.findMany({
      orderBy: { name: "asc" },
      include: { server: { select: { name: true } } },
    }),
    prisma.serverSticker.findMany({
      orderBy: { name: "asc" },
      include: { server: { select: { name: true } } },
    }),
    prisma.globalEmoji.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.globalSticker.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return {
    emojis: [
      ...serverEmojis.map((e) => ({
        id: e.id,
        name: e.name,
        imageUrl: e.imageUrl,
        groupName: e.server?.name || "Server",
      })),
      ...globalEmojis.map((e) => ({
        id: e.id,
        name: e.name,
        imageUrl: e.imageUrl,
        groupName: e.packId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      })),
    ],
    stickers: [
      ...serverStickers.map((s) => ({
        id: s.id,
        name: s.name,
        imageUrl: s.imageUrl,
        groupName: s.server?.name || "Server",
      })),
      ...globalStickers.map((s) => ({
        id: s.id,
        name: s.name,
        imageUrl: s.imageUrl,
        groupName: s.packId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      })),
    ],
  };
}

export async function addServerEmoji(serverId: string, name: string, imageUrl: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  // Must be admin or mod of the server
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });
  if (!member || (member.role !== "ADMIN" && member.role !== "MODERATOR")) {
    throw new Error("Only server admins/mods can add emojis");
  }

  // Clean name: lowercase, no spaces, alphanumeric + underscores
  const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 32);
  if (!cleanName) throw new Error("Invalid emoji name");
  if (!imageUrl.startsWith("http")) throw new Error("Invalid image URL");

  await prisma.serverEmoji.create({
    data: { serverId, name: cleanName, imageUrl, addedById: userId },
  });

  revalidatePath(`/servers`);
  return { success: true };
}

export async function removeServerEmoji(emojiId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const emoji = await prisma.serverEmoji.findUnique({ where: { id: emojiId } });
  if (!emoji) throw new Error("Emoji not found");

  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId: emoji.serverId, userId } },
  });
  if (!member || (member.role !== "ADMIN" && member.role !== "MODERATOR")) {
    throw new Error("Only admins/mods can remove emojis");
  }

  await prisma.serverEmoji.delete({ where: { id: emojiId } });
  revalidatePath(`/servers`);
  return { success: true };
}

export async function addServerSticker(serverId: string, name: string, imageUrl: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });
  if (!member || (member.role !== "ADMIN" && member.role !== "MODERATOR")) {
    throw new Error("Only server admins/mods can add stickers");
  }

  const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 32);
  if (!cleanName) throw new Error("Invalid sticker name");
  if (!imageUrl.startsWith("http")) throw new Error("Invalid image URL");

  await prisma.serverSticker.create({
    data: { serverId, name: cleanName, imageUrl, addedById: userId },
  });

  revalidatePath(`/servers`);
  return { success: true };
}

export async function removeServerSticker(stickerId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const sticker = await prisma.serverSticker.findUnique({ where: { id: stickerId } });
  if (!sticker) throw new Error("Sticker not found");

  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId: sticker.serverId, userId } },
  });
  if (!member || (member.role !== "ADMIN" && member.role !== "MODERATOR")) {
    throw new Error("Only admins/mods can remove stickers");
  }

  await prisma.serverSticker.delete({ where: { id: stickerId } });
  revalidatePath(`/servers`);
  return { success: true };
}

// ==================== GLOBAL PERSONAL EMOJIS ====================

export async function getUserGlobalEmojis(userId?: string) {
  const { userId: authUserId } = auth();
  const targetId = userId || authUserId;
  if (!targetId) return { emojis: [], stickers: [] };

  // Get owned emoji IDs
  const ownedEmojis = await prisma.userOwnedGlobalEmoji.findMany({
    where: { userId: targetId },
    include: { emoji: true },
  });
  const ownedStickers = await prisma.userOwnedGlobalSticker.findMany({
    where: { userId: targetId },
    include: { sticker: true },
  });

  return {
    emojis: ownedEmojis.map((o) => o.emoji).filter((e) => e.isActive),
    stickers: ownedStickers.map((o) => o.sticker).filter((s) => s.isActive),
  };
}

export async function purchaseGlobalEmojiPack(packId: string, isSticker: boolean) {
  const { userId, sessionClaims } = auth();
  if (!userId) throw new Error("Unauthorized");
  const userType = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  // Get all emojis/stickers in this pack
  if (isSticker) {
    const stickers = await prisma.globalSticker.findMany({
      where: { packId, isActive: true },
    });
    if (stickers.length === 0) throw new Error("Pack not found or empty");

    // Grant ownership of all stickers in pack
    await prisma.userOwnedGlobalSticker.createMany({
      data: stickers.map((s) => ({ userId, stickerId: s.id })),
      skipDuplicates: true,
    });
  } else {
    const emojis = await prisma.globalEmoji.findMany({
      where: { packId, isActive: true },
    });
    if (emojis.length === 0) throw new Error("Pack not found or empty");

    await prisma.userOwnedGlobalEmoji.createMany({
      data: emojis.map((e) => ({ userId, emojiId: e.id })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/shop");
  return { success: true };
}

// ==================== GLOBAL EMOJI SHOP DATA ====================

export async function getEmojiShopData() {
  const { userId, sessionClaims } = auth();
  if (!userId) throw new Error("Unauthorized");
  const userType = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  // Seed default packs if none exist
  await seedDefaultEmojiPacks();

  const [allEmojis, allStickers, ownedEmojis, ownedStickers, balance] = await Promise.all([
    prisma.globalEmoji.findMany({ where: { isActive: true }, orderBy: { packId: "asc" } }),
    prisma.globalSticker.findMany({ where: { isActive: true }, orderBy: { packId: "asc" } }),
    prisma.userOwnedGlobalEmoji.findMany({ where: { userId }, select: { emojiId: true } }),
    prisma.userOwnedGlobalSticker.findMany({ where: { userId }, select: { stickerId: true } }),
    prisma.userGecXBalance.findUnique({ where: { userId } }),
  ]);

  const ownedEmojiIds = new Set(ownedEmojis.map((o) => o.emojiId));
  const ownedStickerIds = new Set(ownedStickers.map((o) => o.stickerId));

  // Group by pack
  const emojiPacks = groupByPack(allEmojis, ownedEmojiIds);
  const stickerPacks = groupByPack(allStickers, ownedStickerIds);

  return {
    emojiPacks,
    stickerPacks,
    balance: balance?.balance || 0,
  };
}

function groupByPack<T extends { packId: string; id: string }>(
  items: T[],
  ownedIds: Set<string>
) {
  const packs: Record<string, { packId: string; items: (T & { owned: boolean })[]; allOwned: boolean }> = {};
  for (const item of items) {
    if (!packs[item.packId]) {
      packs[item.packId] = { packId: item.packId, items: [], allOwned: true };
    }
    const owned = ownedIds.has(item.id);
    packs[item.packId].items.push({ ...item, owned });
    if (!owned) packs[item.packId].allOwned = false;
  }
  return Object.values(packs);
}

// ==================== SEED DEFAULT EMOJI PACKS ====================

async function seedDefaultEmojiPacks() {
  const count = await prisma.globalEmoji.count();
  if (count > 0) return; // Already seeded

  const EMOJI_PACKS = [
    {
      packId: "reactions-pack",
      emojis: [
        { name: "gecx_fire", imageUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f525.png" },
        { name: "gecx_heart", imageUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2764.png" },
        { name: "gecx_laugh", imageUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f602.png" },
        { name: "gecx_100", imageUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4af.png" },
        { name: "gecx_star", imageUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2b50.png" },
        { name: "gecx_clap", imageUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f44f.png" },
      ],
    },
    {
      packId: "campus-pack",
      emojis: [
        { name: "gecx_book", imageUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4da.png" },
        { name: "gecx_pencil", imageUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/270f.png" },
        { name: "gecx_grad", imageUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f393.png" },
        { name: "gecx_brain", imageUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f9e0.png" },
        { name: "gecx_trophy", imageUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f3c6.png" },
        { name: "gecx_bulb", imageUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4a1.png" },
      ],
    },
  ];

  const STICKER_PACKS = [
    {
      packId: "wave-stickers",
      stickers: [
        { name: "sticker_hi", imageUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f44b.png" },
        { name: "sticker_bye", imageUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f44b.png" },
        { name: "sticker_thumbs", imageUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f44d.png" },
      ],
    },
  ];

  for (const pack of EMOJI_PACKS) {
    await prisma.globalEmoji.createMany({
      data: pack.emojis.map((e) => ({ ...e, packId: pack.packId })),
      skipDuplicates: true,
    });
  }
  for (const pack of STICKER_PACKS) {
    await prisma.globalSticker.createMany({
      data: pack.stickers.map((s) => ({ ...s, packId: pack.packId })),
      skipDuplicates: true,
    });
  }
}

// ==================== SERVER MEDIA ====================

export async function updateServerMedia(serverId: string, data: { iconUrl?: string; bannerUrl?: string }) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });
  if (!member || member.role !== "ADMIN") {
    throw new Error("Only server admins can update server media");
  }

  await prisma.server.update({
    where: { id: serverId },
    data: {
      ...(data.iconUrl !== undefined && { iconUrl: data.iconUrl || null }),
      ...(data.bannerUrl !== undefined && { bannerUrl: data.bannerUrl || null }),
    },
  });

  revalidatePath("/servers");
  return { success: true };
}

// ==================== GROUP MEDIA ====================

export async function updateGroupBanner(groupId: number, bannerUrl: string | null) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!member || !member.isOwner) {
    throw new Error("Only group owner can update banner");
  }

  await prisma.groupChat.update({
    where: { id: groupId },
    data: { bannerUrl: bannerUrl || null },
  });

  revalidatePath("/messages");
  return { success: true };
}

// ==================== SERVER EMOJI/STICKER SLOT SYSTEM ====================

const BASE_FREE_EMOJIS = 10;
const BASE_FREE_STICKERS = 5;
const MAX_EMOJIS = 500;
const MAX_STICKERS = 200;

const SLOT_PLANS = {
  STARTER: { emojiSlots: 50, stickerSlots: 25, cost: 3000 },
  STANDARD: { emojiSlots: 100, stickerSlots: 50, cost: 5500 },
  PREMIUM: { emojiSlots: 200, stickerSlots: 100, cost: 10000 },
};

export async function getServerSlotInfo(serverId: string) {
  const [emojiCount, stickerCount, purchases] = await Promise.all([
    prisma.serverEmoji.count({ where: { serverId } }),
    prisma.serverSticker.count({ where: { serverId } }),
    prisma.serverEmojiSlotPurchase.findMany({
      where: { serverId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const purchasedEmojiSlots = purchases.reduce((sum, p) => sum + p.emojiSlotsAdded, 0);
  const purchasedStickerSlots = purchases.reduce((sum, p) => sum + p.stickerSlotsAdded, 0);

  const totalEmojiSlots = Math.min(BASE_FREE_EMOJIS + purchasedEmojiSlots, MAX_EMOJIS);
  const totalStickerSlots = Math.min(BASE_FREE_STICKERS + purchasedStickerSlots, MAX_STICKERS);

  return {
    emojiCount,
    stickerCount,
    totalEmojiSlots,
    totalStickerSlots,
    freeEmojiSlots: BASE_FREE_EMOJIS,
    freeStickerSlots: BASE_FREE_STICKERS,
    purchasedEmojiSlots,
    purchasedStickerSlots,
    remainingEmojiSlots: totalEmojiSlots - emojiCount,
    remainingStickerSlots: totalStickerSlots - stickerCount,
    purchases,
  };
}

export async function getUserModeratedServers() {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  // Get all memberships where user is admin or mod
  const memberships = await prisma.serverMember.findMany({
    where: {
      userId,
      role: { in: ["ADMIN", "MODERATOR"] },
    },
    orderBy: { joinedAt: "desc" },
  });

  if (memberships.length === 0) return [];

  // Get server IDs
  const serverIds = memberships.map((m) => m.serverId);

  // Fetch servers separately
  const servers = await prisma.server.findMany({
    where: { id: { in: serverIds } },
    select: {
      id: true,
      name: true,
      icon: true,
    },
  });

  // Create a map of serverId to server data
  const serverMap = new Map(servers.map((s) => [s.id, s]));

  // Get slot info for each server
  const serversWithSlots = await Promise.all(
    memberships.map(async (m) => {
      const server = serverMap.get(m.serverId);
      const slotInfo = await getServerSlotInfo(m.serverId);
      return {
        id: m.serverId,
        name: server?.name || "Unknown Server",
        iconUrl: server?.icon || null,
        role: m.role,
        emojiCount: slotInfo.emojiCount,
        stickerCount: slotInfo.stickerCount,
        totalEmojiSlots: slotInfo.totalEmojiSlots,
        totalStickerSlots: slotInfo.totalStickerSlots,
        remainingEmojiSlots: slotInfo.remainingEmojiSlots,
        remainingStickerSlots: slotInfo.remainingStickerSlots,
      };
    })
  );

  return serversWithSlots;
}

export async function purchaseServerSlotPack(serverId: string, planType: "STARTER" | "STANDARD" | "PREMIUM") {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  // Verify user is admin/mod of this server
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });
  if (!member || (member.role !== "ADMIN" && member.role !== "MODERATOR")) {
    throw new Error("Only server admins/mods can purchase slots");
  }

  const plan = SLOT_PLANS[planType];
  if (!plan) throw new Error("Invalid plan type");

  // Check if purchase would exceed max limits
  const currentSlotInfo = await getServerSlotInfo(serverId);
  const newTotalEmojis = currentSlotInfo.totalEmojiSlots + plan.emojiSlots;
  const newTotalStickers = currentSlotInfo.totalStickerSlots + plan.stickerSlots;

  if (newTotalEmojis > MAX_EMOJIS) {
    throw new Error(`Purchase would exceed maximum emoji limit of ${MAX_EMOJIS}`);
  }
  if (newTotalStickers > MAX_STICKERS) {
    throw new Error(`Purchase would exceed maximum sticker limit of ${MAX_STICKERS}`);
  }

  // Check user balance
  const balance = await prisma.userGecXBalance.findUnique({ where: { userId } });
  if (!balance || balance.balance < plan.cost) {
    throw new Error(`Insufficient gecX balance. Need ${plan.cost} gecX.`);
  }

  // Deduct balance and record purchase in transaction
  await prisma.$transaction([
    // Deduct from user's balance
    prisma.userGecXBalance.update({
      where: { userId },
      data: {
        balance: { decrement: plan.cost },
        totalSpent: { increment: plan.cost },
      },
    }),
    // Record the purchase
    prisma.serverEmojiSlotPurchase.create({
      data: {
        serverId,
        planType,
        emojiSlotsAdded: plan.emojiSlots,
        stickerSlotsAdded: plan.stickerSlots,
        cost: plan.cost,
        purchasedById: userId,
      },
    }),
    // Record transaction for history
    prisma.gecXTransaction.create({
      data: {
        userId,
        userType: (member as any).userRole || "student",
        amount: -plan.cost,
        type: "purchase",
        description: `Purchased ${planType} emoji/sticker slot pack for server`,
      },
    }),
  ]);

  revalidatePath("/shop");
  revalidatePath("/servers");
  return { success: true, planType, emojiSlots: plan.emojiSlots, stickerSlots: plan.stickerSlots };
}

// Update addServerEmoji to check slot limits
export async function addServerEmojiWithSlotCheck(serverId: string, name: string, imageUrl: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  // Must be admin or mod of the server
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });
  if (!member || (member.role !== "ADMIN" && member.role !== "MODERATOR")) {
    throw new Error("Only server admins/mods can add emojis");
  }

  // Check slot availability
  const slotInfo = await getServerSlotInfo(serverId);
  if (slotInfo.remainingEmojiSlots <= 0) {
    throw new Error("No emoji slots available. Purchase more slots in the Shop.");
  }

  // Clean name: lowercase, no spaces, alphanumeric + underscores
  const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 32);
  if (!cleanName) throw new Error("Invalid emoji name");
  if (!imageUrl.startsWith("http")) throw new Error("Invalid image URL");

  // Validate image URL format
  const validImagePattern = /\.(gif|png|jpg|jpeg|webp)(\?.*)?$/i;
  if (!validImagePattern.test(imageUrl)) {
    throw new Error("URL must point to a valid image file (GIF, PNG, JPG, WEBP)");
  }

  await prisma.serverEmoji.create({
    data: { serverId, name: cleanName, imageUrl, addedById: userId },
  });

  revalidatePath(`/servers`);
  return { success: true };
}

// Update addServerSticker to check slot limits
export async function addServerStickerWithSlotCheck(serverId: string, name: string, imageUrl: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });
  if (!member || (member.role !== "ADMIN" && member.role !== "MODERATOR")) {
    throw new Error("Only server admins/mods can add stickers");
  }

  // Check slot availability
  const slotInfo = await getServerSlotInfo(serverId);
  if (slotInfo.remainingStickerSlots <= 0) {
    throw new Error("No sticker slots available. Purchase more slots in the Shop.");
  }

  const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 32);
  if (!cleanName) throw new Error("Invalid sticker name");
  if (!imageUrl.startsWith("http")) throw new Error("Invalid image URL");

  // Validate image URL format
  const validImagePattern = /\.(gif|png|jpg|jpeg|webp)(\?.*)?$/i;
  if (!validImagePattern.test(imageUrl)) {
    throw new Error("URL must point to a valid image file (GIF, PNG, JPG, WEBP)");
  }

  await prisma.serverSticker.create({
    data: { serverId, name: cleanName, imageUrl, addedById: userId },
  });

  revalidatePath(`/servers`);
  return { success: true };
}
