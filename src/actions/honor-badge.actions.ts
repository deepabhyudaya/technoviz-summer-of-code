"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createNotificationsForUsers } from "@/lib/notifications";

async function requireAdmin() {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();
  if (role !== "admin") throw new Error("Admin only");
}

// ==================== BADGE DEFINITION CRUD ====================

export async function createHonorBadgeDefinition(input: {
  code: string;
  name: string;
  description: string;
  category: "SEASON_FINAL" | "WAR_PERFORMANCE" | "STREAK" | "PARTICIPATION" | "SPECIAL";
  tier?: number;
  iconUrl?: string;
  colorHex?: string;
  criteria?: Record<string, any>;
  isActive?: boolean;
  isAutoAwarded?: boolean;
}) {
  await requireAdmin();

  const existing = await prisma.honorBadgeDefinition.findUnique({ where: { code: input.code } });
  if (existing) throw new Error(`Badge code ${input.code} already exists`);

  const { userId } = auth();

  const badge = await prisma.honorBadgeDefinition.create({
    data: {
      code: input.code,
      name: input.name,
      description: input.description,
      category: input.category,
      tier: input.tier ?? 1,
      iconUrl: input.iconUrl ?? null,
      colorHex: input.colorHex ?? null,
      criteria: input.criteria ?? {},
      isActive: input.isActive ?? true,
      isAutoAwarded: input.isAutoAwarded ?? true,
      createdById: userId ?? null,
    },
  });

  revalidatePath("/admin/honor-badges");
  return badge;
}

export async function updateHonorBadgeDefinition(
  badgeId: string,
  input: Partial<{
    name: string;
    description: string;
    category: string;
    tier: number;
    iconUrl: string;
    colorHex: string;
    criteria: Record<string, any>;
    isActive: boolean;
    isAutoAwarded: boolean;
  }>
) {
  await requireAdmin();

  const updated = await prisma.honorBadgeDefinition.update({
    where: { id: badgeId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.tier !== undefined && { tier: input.tier }),
      ...(input.iconUrl !== undefined && { iconUrl: input.iconUrl }),
      ...(input.colorHex !== undefined && { colorHex: input.colorHex }),
      ...(input.criteria !== undefined && { criteria: input.criteria }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.isAutoAwarded !== undefined && { isAutoAwarded: input.isAutoAwarded }),
    },
  });

  revalidatePath("/admin/honor-badges");
  return updated;
}

export async function listHonorBadgeDefinitions(activeOnly = false) {
  return prisma.honorBadgeDefinition.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: { createdAt: "desc" },
  });
}

export async function getHonorBadgeDefinition(badgeId: string) {
  return prisma.honorBadgeDefinition.findUnique({
    where: { id: badgeId },
    include: { awards: { include: { student: true, season: true } } },
  });
}

// ==================== MANUAL AWARD / REVOKE ====================

export async function awardHonorBadgeManual(
  badgeId: string,
  userId: string,
  seasonId?: string,
  evidence?: Record<string, any>
) {
  await requireAdmin();

  const badge = await prisma.honorBadgeDefinition.findUnique({ where: { id: badgeId } });
  if (!badge) throw new Error("Badge not found");
  if (!badge.isActive) throw new Error("Badge is not active");

  const { userId: adminId } = auth();

  try {
    const award = await prisma.honorBadgeAward.create({
      data: {
        badgeId,
        userId,
        seasonId: seasonId ?? null,
        awardedById: adminId ?? null,
        evidence: evidence ?? {},
      },
    });

    await createNotificationsForUsers({
      title: "Honor Badge Awarded!",
      message: `You earned the ${badge.name} badge!`,
      type: "HONOR_BADGE_AWARDED",
      entityId: badgeId,
      studentIds: [userId],
    });

    return award;
  } catch (err: any) {
    if (err.code === "P2002") throw new Error("User already has this badge for this season");
    throw err;
  }
}

export async function revokeHonorBadge(
  awardId: string,
  reason: string
) {
  await requireAdmin();

  const { userId: adminId } = auth();

  const updated = await prisma.honorBadgeAward.update({
    where: { id: awardId },
    data: {
      revokedAt: new Date(),
      revokedById: adminId ?? null,
      revokeReason: reason,
    },
  });

  return updated;
}

// ==================== AUTO-AWARD ENGINE (season conclusion) ====================

export async function autoAwardHonorBadgesForSeason(seasonId: string) {
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: { ranks: true },
  });
  if (!season) throw new Error("Season not found");

  const autoBadges = await prisma.honorBadgeDefinition.findMany({
    where: { isAutoAwarded: true, isActive: true },
  });

  const branchPoints = await prisma.branchSeasonPoints.findMany({
    where: { seasonId },
    include: { class: true },
    orderBy: { totalPoints: "desc" },
  });
  const studentPoints = await prisma.studentSeasonPoints.findMany({
    where: { seasonId },
    include: { student: true },
    orderBy: { totalPoints: "desc" },
  });

  let awarded = 0;

  for (const badge of autoBadges) {
    const criteria = (badge.criteria as Record<string, any>) ?? {};

    // SEASON_FINAL badges
    if (badge.category === "SEASON_FINAL") {
      // Champion / top rank
      if (criteria.target === "season_champion_branch") {
        const top = branchPoints[0];
        if (top) {
          const didAward = await tryAward(badge.id, String(top.classId), seasonId, { rank: 1, points: top.totalPoints });
          if (didAward) awarded++;
        }
      }
      if (criteria.target === "season_champion_student") {
        const top = studentPoints[0];
        if (top) {
          const didAward = await tryAward(badge.id, top.studentId, seasonId, { rank: 1, points: top.totalPoints });
          if (didAward) awarded++;
        }
      }
      // Conqueror
      if (criteria.target === "conqueror") {
        const conquerorStudents = studentPoints.filter((s) => s.isConqueror);
        for (const s of conquerorStudents) {
          const didAward = await tryAward(badge.id, s.studentId, seasonId, { conquerorRank: s.conquerorRank, points: s.totalPoints });
          if (didAward) awarded++;
        }
      }
      // Ranked
      if (criteria.target === "ranked") {
        const minRankOrder = criteria.minRankOrder ?? 1;
        const rankIds = season.ranks.filter((r) => r.rankOrder >= minRankOrder).map((r) => r.id);
        const rankedStudents = studentPoints.filter((s) => s.currentRankId && rankIds.includes(s.currentRankId));
        for (const s of rankedStudents) {
          const didAward = await tryAward(badge.id, s.studentId, seasonId, { rankId: s.currentRankId, points: s.totalPoints });
          if (didAward) awarded++;
        }
      }
    }

    // WAR_PERFORMANCE badges
    if (badge.category === "WAR_PERFORMANCE") {
      if (criteria.target === "perfect_season") {
        const perfect = studentPoints.filter((s) => s.warsLost === 0 && s.warsParticipated >= (criteria.minWars ?? 1));
        for (const s of perfect) {
          const didAward = await tryAward(badge.id, s.studentId, seasonId, { warsWon: s.warsWon, warsLost: s.warsLost });
          if (didAward) awarded++;
        }
      }
      if (criteria.target === "sweep") {
        // Sweeps are recorded via WAR_SWEEP transactions; we can query them.
        const sweepTxs = await prisma.seasonPointTransaction.findMany({
          where: { seasonId, transactionType: "WAR_SWEEP" },
          select: { recipientId: true },
        });
        const sweepers = [...new Set(sweepTxs.map((t) => t.recipientId))];
        for (const sid of sweepers) {
          const didAward = await tryAward(badge.id, sid, seasonId, { target: "sweep" });
          if (didAward) awarded++;
        }
      }
      if (criteria.target === "underdog") {
        const underdogTxs = await prisma.seasonPointTransaction.findMany({
          where: { seasonId, transactionType: "WAR_UNDERDOG" },
          select: { recipientId: true },
        });
        const underdogs = [...new Set(underdogTxs.map((t) => t.recipientId))];
        for (const sid of underdogs) {
          const didAward = await tryAward(badge.id, sid, seasonId, { target: "underdog" });
          if (didAward) awarded++;
        }
      }
    }

    // PARTICIPATION badges
    if (badge.category === "PARTICIPATION") {
      if (criteria.target === "participation") {
        const minWars = criteria.minWars ?? 1;
        const participants = studentPoints.filter((s) => s.warsParticipated >= minWars);
        for (const s of participants) {
          const didAward = await tryAward(badge.id, s.studentId, seasonId, { warsParticipated: s.warsParticipated });
          if (didAward) awarded++;
        }
      }
    }

    // STREAK badges
    if (badge.category === "STREAK") {
      if (criteria.target === "win_streak") {
        const minStreak = criteria.minStreak ?? 3;
        // We don't have a streak field; approximate from transactions ordered by time.
        // For simplicity, use warsWon as a proxy if exact streak tracking isn't in schema.
        // A proper implementation would track per-student consecutive win transactions.
        // Skipping for now — can be enhanced later.
      }
    }
  }

  return { awarded };
}

async function tryAward(
  badgeId: string,
  userId: string,
  seasonId: string | undefined,
  evidence: Record<string, any>
) {
  try {
    await prisma.honorBadgeAward.create({
      data: {
        badgeId,
        userId,
        seasonId: seasonId ?? null,
        awardedById: null,
        evidence,
      },
    });
    return true;
  } catch (err: any) {
    if (err.code === "P2002") return false; // already awarded
    throw err;
  }
}

// ==================== USER BADGE QUERIES ====================

export async function getUserHonorBadges(userId: string, seasonId?: string) {
  return prisma.honorBadgeAward.findMany({
    where: {
      userId,
      ...(seasonId ? { seasonId } : {}),
      revokedAt: null,
    },
    include: { badge: true, season: true },
    orderBy: { awardedAt: "desc" },
  });
}

export async function getBadgeRecipients(badgeId: string, seasonId?: string) {
  return prisma.honorBadgeAward.findMany({
    where: {
      badgeId,
      ...(seasonId ? { seasonId } : {}),
      revokedAt: null,
    },
    include: { student: true, season: true },
    orderBy: { awardedAt: "desc" },
  });
}
