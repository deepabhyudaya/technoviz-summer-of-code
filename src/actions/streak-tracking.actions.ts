"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

/**
 * Record user activity for today and update streak
 * Call this whenever a user sends a message, posts, comments, etc.
 */
export async function recordUserActivity(
  userId?: string,
  activityType: "message" | "post" | "comment" | "general" = "general"
) {
  const targetUserId = userId || (await auth()).userId;
  if (!targetUserId) return;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  // Upsert activity log for today
  await prisma.$executeRaw`
    INSERT INTO "UserActivityLog" ("id", "userId", "date", "year", "month", "day", "activityType", "createdAt")
    VALUES (gen_random_uuid(), ${targetUserId}, ${today}, ${year}, ${month}, ${day}, ${activityType}, NOW())
    ON CONFLICT ("userId", "date") DO UPDATE
    SET "activityType" = EXCLUDED."activityType",
        "createdAt" = NOW();
  `;

  // Get user's current streak info
  const profiles = await prisma.$queryRaw`
    SELECT "currentStreak", "longestStreak", "lastActiveDate"
    FROM "UserCommunityProfile"
    WHERE "userId" = ${targetUserId}
    LIMIT 1
  `;
  const profile = (profiles as any[])[0];
  if (!profile) return;

  const lastActive = profile.lastActiveDate ? new Date(profile.lastActiveDate) : null;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let newStreak = profile.currentStreak || 0;

  if (!lastActive) {
    // First activity ever
    newStreak = 1;
  } else {
    const lastActiveDate = new Date(
      lastActive.getFullYear(),
      lastActive.getMonth(),
      lastActive.getDate()
    );

    if (lastActiveDate.getTime() === today.getTime()) {
      // Already active today, streak unchanged
      newStreak = profile.currentStreak || 1;
    } else if (lastActiveDate.getTime() === yesterday.getTime()) {
      // Continued streak
      newStreak = (profile.currentStreak || 0) + 1;
    } else {
      // Streak broken, restart
      newStreak = 1;
    }
  }

  const newLongest = Math.max(newStreak, profile.longestStreak || 0);

  // Update profile streak
  await prisma.$executeRaw`
    UPDATE "UserCommunityProfile"
    SET "currentStreak" = ${newStreak},
        "longestStreak" = ${newLongest},
        "lastActiveDate" = ${today},
        "updatedAt" = NOW()
    WHERE "userId" = ${targetUserId}
  `;
}

/**
 * Get streak info for any user
 */
export async function getUserStreak(userId: string) {
  const profiles = await prisma.$queryRaw`
    SELECT "currentStreak", "longestStreak", "lastActiveDate"
    FROM "UserCommunityProfile"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  const profile = (profiles as any[])[0];

  if (!profile) {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
  }

  return {
    currentStreak: profile.currentStreak || 0,
    longestStreak: profile.longestStreak || 0,
    lastActiveDate: profile.lastActiveDate ? new Date(profile.lastActiveDate) : null,
  };
}

/**
 * Get current user's streak info
 */
export async function getMyStreak() {
  const { userId } = auth();
  if (!userId) return { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
  return getUserStreak(userId);
}
