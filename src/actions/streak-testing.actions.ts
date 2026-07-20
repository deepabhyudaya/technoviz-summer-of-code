"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

// Set a custom streak for any user (admin testing)
export async function setCustomUserStreak(username: string, streak: number) {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin") throw new Error("Admin only");

  if (!username || typeof streak !== "number" || streak < 0) {
    throw new Error("Invalid username or streak amount");
  }

  // Find user profile
  const profiles = await prisma.$queryRaw`
    SELECT "userId", "currentStreak", "longestStreak"
    FROM "UserCommunityProfile"
    WHERE LOWER(username) = LOWER(${username})
    LIMIT 1
  `;
  const profile = (profiles as any[])[0];
  if (!profile) throw new Error("User not found");

  const newLongest = Math.max(Number(profile.longestStreak) || 0, streak);
  const lastActive = streak > 0 ? new Date().toISOString() : null;

  await prisma.$executeRaw`
    UPDATE "UserCommunityProfile"
    SET "currentStreak" = ${streak},
        "longestStreak" = ${newLongest},
        "lastActiveDate" = ${lastActive}::timestamp,
        "updatedAt" = NOW()
    WHERE "userId" = ${profile.userId}
  `;

  revalidatePath(`/${username}`);
  revalidatePath("/community");
  revalidatePath("/leaderboard");

  return {
    success: true,
    username,
    currentStreak: streak,
    longestStreak: newLongest,
  };
}

// Set a custom streak for all admins (testing)
export async function setStreakForAllAdmins(streak: number) {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin") throw new Error("Admin only");

  const admins = await prisma.admin.findMany({
    select: { id: true, username: true },
  });

  const results = [];
  const lastActive = streak > 0 ? new Date().toISOString() : null;

  for (const admin of admins) {
    // Check if profile exists
    const profiles = await prisma.$queryRaw`
      SELECT "userId", "longestStreak" FROM "UserCommunityProfile"
      WHERE "userId" = ${admin.id}
      LIMIT 1
    `;
    const profile = (profiles as any[])[0];

    if (!profile) {
      // Create profile with streak
      await prisma.$executeRaw`
        INSERT INTO "UserCommunityProfile"
          ("userId", "userType", "username", "displayName", "currentStreak", "longestStreak", "lastActiveDate", "createdAt", "updatedAt")
        VALUES
          (${admin.id}, 'admin', ${admin.username || `admin_${admin.id.slice(-8)}`}, ${admin.username || "Admin"}, ${streak}, ${streak}, ${lastActive}::timestamp, NOW(), NOW())
      `;
    } else {
      const newLongest = Math.max(Number(profile.longestStreak) || 0, streak);
      await prisma.$executeRaw`
        UPDATE "UserCommunityProfile"
        SET "currentStreak" = ${streak},
            "longestStreak" = ${newLongest},
            "lastActiveDate" = ${lastActive}::timestamp,
            "updatedAt" = NOW()
        WHERE "userId" = ${admin.id}
      `;
    }

    results.push({
      userId: admin.id,
      username: admin.username,
      currentStreak: streak,
    });
  }

  revalidatePath("/community");
  revalidatePath("/leaderboard");

  return { success: true, updated: results.length, admins: results };
}

// Reset streak for any user (admin testing)
export async function resetUserStreak(username: string) {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin") throw new Error("Admin only");

  // Find user profile
  const profiles = await prisma.$queryRaw`
    SELECT "userId", "currentStreak", "longestStreak"
    FROM "UserCommunityProfile"
    WHERE LOWER(username) = LOWER(${username})
    LIMIT 1
  `;
  const profile = (profiles as any[])[0];
  if (!profile) throw new Error("User not found");

  // Delete activity logs for this user
  await prisma.$executeRaw`
    DELETE FROM "UserActivityLog"
    WHERE "userId" = ${profile.userId}
  `;

  await prisma.$executeRaw`
    UPDATE "UserCommunityProfile"
    SET "currentStreak" = 0,
        "lastActiveDate" = NULL,
        "updatedAt" = NOW()
    WHERE "userId" = ${profile.userId}
  `;

  revalidatePath(`/${username}`);
  revalidatePath("/community");
  revalidatePath("/leaderboard");

  return {
    success: true,
    username,
    currentStreak: 0,
    longestStreak: Number(profile.longestStreak) || 0,
  };
}
