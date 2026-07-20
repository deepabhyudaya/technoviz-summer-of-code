"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { getKarmaSettings } from "./karma-settings.actions";

// Karma calculation weights
const KARMA_WEIGHTS = {
  academic: 0.4,
  engagement: 0.6,
};

// Add 5M karma to all admins (one-time testing function)
export async function addKarmaToAdminsForTesting() {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin") throw new Error("Admin only");

  // Get all admins
  const admins = await prisma.admin.findMany({
    select: { id: true, username: true },
  });

  const results = [];

  for (const admin of admins) {
    // Get or create community profile for admin
    let profile = await prisma.userCommunityProfile.findUnique({
      where: { userId: admin.id },
    });

    if (!profile) {
      // Create profile if doesn't exist
      profile = await prisma.userCommunityProfile.create({
        data: {
          userId: admin.id,
          userType: "admin",
          username: admin.username || `admin_${admin.id.slice(-8)}`,
          displayName: admin.username || "Admin",
          karmaPoints: 5000000,
        },
      });
    } else {
      // Add 5M to existing karma
      profile = await prisma.userCommunityProfile.update({
        where: { userId: admin.id },
        data: { karmaPoints: profile.karmaPoints + 5000000 },
      });
    }

    results.push({
      adminId: admin.id,
      username: profile.username,
      newKarma: profile.karmaPoints,
    });
  }

  return { success: true, updated: results.length, admins: results };
}

// Add custom karma to any user (testing function for admins)
export async function addCustomKarmaToUser(username: string, amount: number) {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin") throw new Error("Admin only");

  if (!username || typeof amount !== "number" || amount <= 0) {
    throw new Error("Invalid username or amount");
  }

  // Find user by username; auto-create profile if missing (e.g. after data wipe)
  let userProfile = await prisma.userCommunityProfile.findUnique({
    where: { username: username.toLowerCase() },
  });

  if (!userProfile) {
    const clerkUser = await (await import("@clerk/nextjs/server")).clerkClient.users.getUserList({ query: username.toLowerCase() });
    const matched = clerkUser.data[0];
    if (!matched) throw new Error("User not found in auth system");
    const userType = ((matched.publicMetadata as any)?.role as string) || "student";
    userProfile = await prisma.userCommunityProfile.create({
      data: {
        userId: matched.id,
        userType,
        username: username.toLowerCase(),
        displayName: matched.firstName || matched.username || username,
        karmaPoints: amount,
      },
    });
    return {
      success: true,
      username: userProfile.username,
      oldKarma: 0,
      newKarma: amount,
      added: amount,
    };
  }

  // Add karma to user
  const updatedProfile = await prisma.userCommunityProfile.update({
    where: { userId: userProfile.userId },
    data: { karmaPoints: userProfile.karmaPoints + amount },
  });

  return {
    success: true,
    username: updatedProfile.username,
    oldKarma: userProfile.karmaPoints,
    newKarma: updatedProfile.karmaPoints,
    added: amount,
  };
}

// Calculate karma for a specific user
export async function calculateKarma(userId: string) {
  // Get academic data
  const student = await prisma.student.findUnique({
    where: { id: userId },
    include: {
      results: {
        include: {
          exam: true,
          assignment: true,
        },
      },
      attendances: true,
    },
  });

  let academicKarma = 0;
  const settings = await getKarmaSettings();

  if (student) {
    // Assignment/exam results karma - based on percentage thresholds
    for (const result of student.results) {
      if (result.score >= 95) {
        academicKarma += settings.resultAbove95;
      } else if (result.score >= 90) {
        academicKarma += settings.resultAbove90;
      } else if (result.score >= 85) {
        academicKarma += settings.resultAbove85;
      } else if (result.score >= 80) {
        academicKarma += settings.resultAbove80;
      } else if (result.score >= 70) {
        academicKarma += settings.resultAbove70;
      } else if (result.score >= 60) {
        academicKarma += settings.resultAbove60;
      }
    }

    // Attendance karma - per day + perfect week bonus
    const attendanceByWeek = new Map<string, { total: number; present: number }>();
    for (const attendance of student.attendances) {
      const weekKey = getWeekKey(attendance.date);
      const week = attendanceByWeek.get(weekKey) || { total: 0, present: 0 };
      week.total++;
      if (attendance.present) {
        week.present++;
        // Award karma for each day present
        academicKarma += settings.attendancePerDay;
      }
      attendanceByWeek.set(weekKey, week);
    }

    // Perfect attendance week bonus
    for (const week of Array.from(attendanceByWeek.values())) {
      if (week.total > 0 && week.present === week.total) {
        academicKarma += settings.perfectAttendanceWeek;
      }
    }
  }

  // Also check teacher attendance if user is a teacher
  const teacher = await prisma.teacher.findUnique({
    where: { id: userId },
    include: { attendances: true },
  });

  if (teacher) {
    const attendanceByWeek = new Map<string, { total: number; present: number }>();
    for (const attendance of teacher.attendances) {
      const weekKey = getWeekKey(attendance.date);
      const week = attendanceByWeek.get(weekKey) || { total: 0, present: 0 };
      week.total++;
      if (attendance.present) week.present++;
      attendanceByWeek.set(weekKey, week);
    }

    for (const week of Array.from(attendanceByWeek.values())) {
      if (week.total > 0 && week.present === week.total) {
        academicKarma += settings.perfectAttendanceWeek;
      }
    }
  }

  // Get engagement data
  const profile = await prisma.userCommunityProfile.findUnique({
    where: { userId },
    include: {
      posts: {
        include: {
          likes: true,
          reposts: { where: { isDeleted: false } },
        },
      },
    },
  });

  let engagementKarma = 0;
  let postLikesReceived = 0;
  let repostsReceived = 0;

  if (profile) {
    // Posts created (now handled via recordKarmaEarned for real-time updates)
    // Keep for backward compatibility calculation only

    // Likes received on posts (now handled via recordKarmaEarned for real-time updates)
    for (const post of profile.posts) {
      postLikesReceived += post.likes.length;
    }

    // Reposts received (now handled via recordKarmaEarned for real-time updates)
    for (const post of profile.posts) {
      repostsReceived += post.reposts.length;
    }
  }

  // Store these for details
  const totalPostLikesReceived = postLikesReceived;

  // Get likes received on comments (now handled via recordKarmaEarned for real-time updates)
  const commentLikes = await prisma.communityCommentLike.count({
    where: {
      comment: { authorId: userId },
    },
  });

  // Get group message reactions received (now handled via recordKarmaEarned for real-time updates)
  const groupMessageReactions = await prisma.groupMessageReaction.count({
    where: {
      message: { senderId: userId },
    },
  });

  // Calculate total karma (cap academic and engagement separately for balance)
  const maxAcademicKarma = 1000;
  const maxEngagementKarma = 2000;

  const cappedAcademic = Math.min(academicKarma, maxAcademicKarma);
  const cappedEngagement = Math.min(engagementKarma, maxEngagementKarma);

  const totalKarma = Math.round(
    cappedAcademic * KARMA_WEIGHTS.academic +
    cappedEngagement * KARMA_WEIGHTS.engagement
  );

  // Update user's karma (auto-create profile after data wipe)
  await prisma.userCommunityProfile.upsert({
    where: { userId },
    update: { karmaPoints: totalKarma },
    create: {
      userId,
      userType: "student",
      username: userId.toLowerCase(),
      karmaPoints: totalKarma,
    },
  });

  return {
    totalKarma,
    breakdown: {
      academic: {
        raw: academicKarma,
        capped: cappedAcademic,
        weight: KARMA_WEIGHTS.academic,
        contribution: Math.round(cappedAcademic * KARMA_WEIGHTS.academic),
      },
      engagement: {
        raw: engagementKarma,
        capped: cappedEngagement,
        weight: KARMA_WEIGHTS.engagement,
        contribution: Math.round(cappedEngagement * KARMA_WEIGHTS.engagement),
      },
    },
    details: {
      assignmentsCompleted: student?.results.length || 0,
      postsCreated: profile?.postCount || 0,
      postLikesReceived,
      commentLikesReceived: commentLikes,
      repostsReceived: profile?.posts.reduce((acc: number, p: { reposts: { length: number } }) => acc + p.reposts.length, 0) || 0,
      groupMessageReactionsReceived: groupMessageReactions,
    },
  };
}

// Get karma breakdown for a user
export async function getKarmaBreakdown(userId?: string) {
  const { userId: currentUserId } = auth();
  const targetUserId = userId || currentUserId;

  if (!targetUserId) throw new Error("Unauthorized");

  // Recalculate to get fresh data
  return await calculateKarma(targetUserId);
}

// Sync karma for all users (admin only)
export async function syncAllKarma() {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin") throw new Error("Admin only");

  const profiles = await prisma.userCommunityProfile.findMany({
    select: { userId: true },
  });

  const results = [];
  for (const profile of profiles) {
    try {
      const karma = await calculateKarma(profile.userId);
      results.push({ userId: profile.userId, karma: karma.totalKarma });
    } catch (e) {
      results.push({ userId: profile.userId, error: (e as Error).message });
    }
  }

  return { synced: results.length, results };
}

// Helper to get week key from date
function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
  return d.toISOString().split("T")[0];
}

// Get karma leaderboard (backward compatibility - redirects to new function)
export async function getKarmaLeaderboard(limit: number = 20) {
  // Re-export from karma-tracking for consistency
  const { getAllTimeLeaderboard } = await import("./karma-tracking.actions");
  return getAllTimeLeaderboard(limit);
}

// Re-export getLeaderboard for timeframe-based leaderboards
export async function getLeaderboard(timeframe: "today" | "week" | "month" | "all" = "all", limit: number = 20) {
  const { getLeaderboard: getLeaderboardImpl } = await import("./karma-tracking.actions");
  return getLeaderboardImpl(timeframe, limit);
}

// Re-export getUserKarmaBreakdown
export async function getUserKarmaBreakdown(userId: string) {
  const { getUserKarmaBreakdown: getUserKarmaBreakdownImpl } = await import("./karma-tracking.actions");
  return getUserKarmaBreakdownImpl(userId);
}
