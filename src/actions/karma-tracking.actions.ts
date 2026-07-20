"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Record karma earned for today
 * This should be called whenever a user earns karma
 */
export async function recordKarmaEarned(
  userId: string,
  points: number,
  source?: string
) {
  if (points <= 0) return;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Upsert karma history for today using raw SQL
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  
  // Upsert karma history for today, avoiding duplicate key race conditions
  await prisma.$executeRaw`
    INSERT INTO "KarmaHistory" ("id", "userId", "date", "year", "month", "day", "karmaEarned", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${userId}, ${today}, ${year}, ${month}, ${day}, ${points}, NOW(), NOW())
    ON CONFLICT ("userId", "date") DO UPDATE
    SET "karmaEarned" = "KarmaHistory"."karmaEarned" + EXCLUDED."karmaEarned",
        "updatedAt" = NOW();
  `;

  // Upsert user's total karma points (auto-create profile after data wipe)
  await prisma.userCommunityProfile.upsert({
    where: { userId },
    update: { karmaPoints: { increment: points } },
    create: {
      userId,
      userType: "student",
      username: userId.toLowerCase(),
      karmaPoints: points,
    },
  });

  // Revalidate cache for instant UI updates
  revalidateTag("leaderboard");
  revalidatePath("/leaderboard");
  revalidatePath(`/${userId}`);

  console.log(`[Karma] ${userId} earned ${points} points from ${source || "unknown"}`);
}

/**
 * Get karma history for a specific date range
 */
export async function getKarmaHistory(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  return prisma.karmaHistory.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      date: "desc",
    },
  });
}

/**
 * Get today's karma for a user
 */
export async function getTodayKarma(userId: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStr = today.toISOString().split('T')[0]; // Format as YYYY-MM-DD

  // Use raw query to bypass PostgreSQL cached plan issue
  const result = await prisma.$queryRaw`
    SELECT "karmaEarned" FROM "KarmaHistory"
    WHERE "userId" = ${userId} AND "date" = ${dateStr}::date
    LIMIT 1
  `;
  const history = (result as any[])[0];

  return history?.karmaEarned || 0;
}

/**
 * Get this week's karma for a user
 */
export async function getThisWeekKarma(userId: string) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const startStr = startOfWeek.toISOString().split('T')[0];
  const endStr = endOfWeek.toISOString().split('T')[0];

  // Use raw query to bypass PostgreSQL cached plan issue
  const result = await prisma.$queryRaw`
    SELECT SUM("karmaEarned") as "totalKarma" FROM "KarmaHistory"
    WHERE "userId" = ${userId} 
    AND "date" >= ${startStr}::date 
    AND "date" <= ${endStr}::date
  `;
  const total = (result as any[])[0]?.totalKarma;

  return Number(total) || 0;
}

/**
 * Get this month's karma for a user
 */
export async function getThisMonthKarma(userId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Use raw query to bypass PostgreSQL cached plan issue
  const result = await prisma.$queryRaw`
    SELECT SUM("karmaEarned") as "totalKarma" FROM "KarmaHistory"
    WHERE "userId" = ${userId} 
    AND "year" = ${year} 
    AND "month" = ${month}
  `;
  const total = (result as any[])[0]?.totalKarma;

  return Number(total) || 0;
}

/**
 * Get karma breakdown for current user
 */
export async function getMyKarmaBreakdown() {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const [today, week, month] = await Promise.all([
    getTodayKarma(userId),
    getThisWeekKarma(userId),
    getThisMonthKarma(userId),
  ]);

  // Use raw query to bypass PostgreSQL cached plan issue
  const profiles = await prisma.$queryRaw`
    SELECT "karmaPoints" FROM "UserCommunityProfile" 
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  const profile = (profiles as any[])[0] || null;

  return {
    today,
    week,
    month,
    total: profile?.karmaPoints || 0,
  };
}

/**
 * Get karma breakdown for any user
 */
export async function getUserKarmaBreakdown(userId: string) {
  const [today, week, month] = await Promise.all([
    getTodayKarma(userId),
    getThisWeekKarma(userId),
    getThisMonthKarma(userId),
  ]);

  // Use raw query to bypass PostgreSQL cached plan issue
  const profiles = await prisma.$queryRaw`
    SELECT "karmaPoints", "showKarma" FROM "UserCommunityProfile" 
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  const profile = (profiles as any[])[0] || null;

  // showKarma is now a string: "nobody", "followers", or "everyone"
  // For public API, only show if set to "everyone"
  if (!profile || profile.showKarma === "nobody") {
    return null;
  }

  return {
    today,
    week,
    month,
    total: profile.karmaPoints || 0,
  };
}

/**
 * Get today's leaderboard - top users by karma earned today
 */
export async function getDailyLeaderboard(limit: number = 20) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStr = today.toISOString().split('T')[0];

  // Use raw SQL to bypass cached plan error and filter by showKarma = 'everyone'
  const entries = await prisma.$queryRaw`
    SELECT kh."karmaEarned", ucp."userId", ucp."username", ucp."displayName", ucp."avatar", ucp."customAvatar", ucp."karmaPoints", ucp."currentStreak"
    FROM "KarmaHistory" kh
    JOIN "UserCommunityProfile" ucp ON kh."userId" = ucp."userId"
    WHERE kh."date" = ${dateStr}::date AND ucp."showKarma" = 'everyone'
    ORDER BY kh."karmaEarned" DESC
    LIMIT ${limit}
  `;

  return (entries as any[]).map((entry, index) => ({
    rank: index + 1,
    userId: entry.userId,
    username: entry.username,
    displayName: entry.displayName,
    avatar: entry.customAvatar || entry.avatar,
    karmaEarned: entry.karmaEarned,
    totalKarma: entry.karmaPoints,
    currentStreak: Number(entry.currentStreak) || 0,
  }));
}

/**
 * Get weekly leaderboard - top users by karma earned this week
 */
export async function getWeeklyLeaderboard(limit: number = 20) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const startStr = startOfWeek.toISOString().split('T')[0];
  const endStr = endOfWeek.toISOString().split('T')[0];

  // Group by user and sum karma using raw SQL
  const entries = await prisma.$queryRaw`
    SELECT "userId", SUM("karmaEarned") as "totalKarma"
    FROM "KarmaHistory"
    WHERE "date" >= ${startStr}::date AND "date" <= ${endStr}::date
    GROUP BY "userId"
    ORDER BY SUM("karmaEarned") DESC
    LIMIT ${limit}
  `;

  // Get user details using raw SQL - filter by showKarma = 'everyone'
  const userIds = (entries as any[]).map((e) => e.userId);
  if (userIds.length === 0) return [];
  
  const users = await prisma.$queryRaw`
    SELECT "userId", "username", "displayName", "avatar", "customAvatar", "karmaPoints", "currentStreak"
    FROM "UserCommunityProfile"
    WHERE "userId" IN (${Prisma.join(userIds)}) AND "showKarma" = 'everyone'
  `;

  const userMap = new Map((users as any[]).map((u) => [u.userId, u]));

  return (entries as any[])
    .map((entry, index) => {
      const user = userMap.get(entry.userId);
      if (!user) return null;
      return {
        rank: index + 1,
        userId: entry.userId,
        username: user.username,
        displayName: user.displayName,
        avatar: user.customAvatar || user.avatar,
        karmaEarned: Number(entry.totalKarma) || 0,
        totalKarma: user.karmaPoints,
        currentStreak: Number(user.currentStreak) || 0,
      };
    })
    .filter(Boolean) as LeaderboardEntry[];
}

/**
 * Get monthly leaderboard - top users by karma earned this month
 */
export async function getMonthlyLeaderboard(limit: number = 20) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Group by user and sum karma using raw SQL
  const entries = await prisma.$queryRaw`
    SELECT "userId", SUM("karmaEarned") as "totalKarma"
    FROM "KarmaHistory"
    WHERE "year" = ${year} AND "month" = ${month}
    GROUP BY "userId"
    ORDER BY SUM("karmaEarned") DESC
    LIMIT ${limit}
  `;

  // Get user details using raw SQL - filter by showKarma = 'everyone'
  const userIds = (entries as any[]).map((e) => e.userId);
  if (userIds.length === 0) return [];
  
  const users = await prisma.$queryRaw`
    SELECT "userId", "username", "displayName", "avatar", "customAvatar", "karmaPoints", "currentStreak"
    FROM "UserCommunityProfile"
    WHERE "userId" IN (${Prisma.join(userIds)}) AND "showKarma" = 'everyone'
  `;

  const userMap = new Map((users as any[]).map((u) => [u.userId, u]));

  return (entries as any[])
    .map((entry, index) => {
      const user = userMap.get(entry.userId);
      if (!user) return null;
      return {
        rank: index + 1,
        userId: entry.userId,
        username: user.username,
        displayName: user.displayName,
        avatar: user.customAvatar || user.avatar,
        karmaEarned: Number(entry.totalKarma) || 0,
        totalKarma: user.karmaPoints,
        currentStreak: Number(user.currentStreak) || 0,
      };
    })
    .filter(Boolean) as LeaderboardEntry[];
}

/**
 * Get all-time leaderboard - top users by total karma
 */
export async function getAllTimeLeaderboard(limit: number = 20) {
  // Use raw SQL to bypass cached plan error and filter by showKarma = 'everyone'
  const users = await prisma.$queryRaw`
    SELECT "userId", "username", "displayName", "avatar", "customAvatar", "karmaPoints", "currentStreak"
    FROM "UserCommunityProfile"
    WHERE "showKarma" = 'everyone' AND "karmaPoints" > 0
    ORDER BY "karmaPoints" DESC
    LIMIT ${limit}
  `;

  return (users as any[]).map((user, index) => ({
    rank: index + 1,
    userId: user.userId,
    username: user.username,
    displayName: user.displayName,
    avatar: user.customAvatar || user.avatar,
    karmaEarned: user.karmaPoints,
    totalKarma: user.karmaPoints,
    currentStreak: Number(user.currentStreak) || 0,
  }));
}

// Type definition for leaderboard entries
export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  karmaEarned: number;
  totalKarma: number;
  currentStreak: number;
};

/**
 * Get leaderboard by timeframe
 */
export async function getLeaderboard(
  timeframe: "today" | "week" | "month" | "all",
  limit: number = 20
) {
  switch (timeframe) {
    case "today":
      return getDailyLeaderboard(limit);
    case "week":
      return getWeeklyLeaderboard(limit);
    case "month":
      return getMonthlyLeaderboard(limit);
    case "all":
      return getAllTimeLeaderboard(limit);
    default:
      return getAllTimeLeaderboard(limit);
  }
}

/**
 * Get current user's rank for a specific timeframe
 */
export async function getMyRank(timeframe: "today" | "week" | "month" | "all") {
  const { userId } = auth();
  if (!userId) return null;

  // Use raw SQL to bypass cached plan error
  const profiles = await prisma.$queryRaw`
    SELECT "showKarma" FROM "UserCommunityProfile"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  const profile = (profiles as any[])[0];

  // Only show rank if showKarma is not 'nobody'
  if (!profile || profile.showKarma === "nobody") return null;

  // Get leaderboard and find user's rank
  const leaderboard = await getLeaderboard(timeframe, 100);
  const userEntry = leaderboard.find((e: LeaderboardEntry) => e.userId === userId);

  return userEntry?.rank || null;
}
