import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json({ emojis: [] }, { status: 401 });
  }

  try {
    // Get all server IDs the user is a member of (for marking usable)
    const memberships = await prisma.serverMember.findMany({
      where: { userId },
      select: { serverId: true },
    });
    const userServerIds = new Set(memberships.map((m) => m.serverId));

    // Get owned global emoji IDs
    const ownedGlobalEmojis = await prisma.userOwnedGlobalEmoji.findMany({
      where: { userId },
      select: { emojiId: true },
    });
    const ownedGlobalEmojiIds = new Set(ownedGlobalEmojis.map((o) => o.emojiId));

    // Fetch ALL server emojis + ALL global emojis (for rendering posts/messages from any user)
    const [allServerEmojis, globalEmojis] = await Promise.all([
      prisma.serverEmoji.findMany({
        orderBy: { name: "asc" },
        include: { server: { select: { id: true, name: true } } },
      }),
      prisma.globalEmoji.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const emojis = [
      ...allServerEmojis.map((e) => ({
        id: e.id,
        name: e.name,
        imageUrl: e.imageUrl,
        groupName: e.server?.name || "Server",
        // Only usable if the viewer is a member of that server
        usable: userServerIds.has(e.serverId),
      })),
      ...globalEmojis.map((e) => ({
        id: e.id,
        name: e.name,
        imageUrl: e.imageUrl,
        groupName: e.packId.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        // Only usable if the viewer owns this global emoji
        usable: ownedGlobalEmojiIds.has(e.id),
        packId: e.packId,
      })),
    ];

    // Per-user cache (private) — emoji catalog rarely changes (admin uploads)
    // and re-fetching it on every dashboard mount/SPA-nav burns DB. 60s
    // freshness is fine; new emojis show up after one minute or a hard reload.
    return NextResponse.json(
      { emojis },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch user emojis:", error);
    return NextResponse.json({ emojis: [] }, { status: 500 });
  }
}
