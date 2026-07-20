"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { recordKarmaEarned } from "./karma-tracking.actions";
import { getKarmaSettings } from "./karma-settings.actions";
import { recordUserActivity } from "./streak-tracking.actions";

const COMMENTS_PER_PAGE = 20;

// Helper to get or create community profile
async function getOrCreateCommunityProfile(userId: string) {
  const { sessionClaims } = auth();
  const clerkUser = await currentUser();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  let profile = await prisma.userCommunityProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    const username = clerkUser?.username || `user_${userId.slice(-8)}`;
    const displayName = clerkUser?.fullName || clerkUser?.username || "User";

    profile = await prisma.userCommunityProfile.create({
      data: {
        userId,
        userType: role,
        username: username.toLowerCase(),
        displayName,
        avatar: clerkUser?.imageUrl || null,
      },
    });
  }

  return profile;
}

// Create a comment
export async function createComment(postId: string, content: string, parentId?: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  const profile = await getOrCreateCommunityProfile(userId);

  // Verify post exists
  const post = await prisma.communityPost.findUnique({
    where: { id: postId, isDeleted: false },
  });

  if (!post) throw new Error("Post not found");

  // If parentId provided, verify parent comment exists
  if (parentId) {
    const parentComment = await prisma.communityComment.findUnique({
      where: { id: parentId, postId, isDeleted: false },
    });
    if (!parentComment) throw new Error("Parent comment not found");
  }

  const comment = await prisma.communityComment.create({
    data: {
      content: content.slice(0, 2000),
      authorId: userId,
      authorType: role,
      authorName: profile.displayName || profile.username,
      authorImage: profile.avatar,
      postId,
      parentId: parentId || null,
    },
  });

  // Update comment count on post
  await prisma.communityPost.update({
    where: { id: postId },
    data: { commentCount: { increment: 1 } },
  });

  // Award karma to comment creator
  const settings = await getKarmaSettings();
  await recordKarmaEarned(userId, settings.commentCreated, "comment_created");
  await recordUserActivity(userId, "comment");
  
  // Award karma to post author when someone comments on their post
  if (post.authorId !== userId) {
    await recordKarmaEarned(post.authorId, settings.commentReceived, "comment_received");
  }

  revalidatePath(`/community/post/${postId}`);
  revalidatePath("/community");

  return comment;
}

// Delete a comment
export async function deleteComment(commentId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const comment = await prisma.communityComment.findUnique({
    where: { id: commentId },
    include: { post: true },
  });

  if (!comment) throw new Error("Comment not found");

  // Check if user is author or admin
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (comment.authorId !== userId && role !== "admin") {
    throw new Error("Unauthorized to delete this comment");
  }

  await prisma.communityComment.update({
    where: { id: commentId },
    data: { isDeleted: true },
  });

  // Decrement comment count on post
  await prisma.communityPost.update({
    where: { id: comment.postId },
    data: { commentCount: { decrement: 1 } },
  });

  revalidatePath(`/community/post/${comment.postId}`);
  revalidatePath("/community");
}

// Like/unlike a comment
export async function likeComment(commentId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const existingLike = await prisma.communityCommentLike.findUnique({
    where: {
      commentId_userId: { commentId, userId },
    },
  });

  if (existingLike) {
    // Unlike
    await prisma.communityCommentLike.delete({
      where: { id: existingLike.id },
    });

    await prisma.communityComment.update({
      where: { id: commentId },
      data: { likeCount: { decrement: 1 } },
    });

    return { liked: false };
  } else {
    // Like
    await prisma.communityCommentLike.create({
      data: { commentId, userId },
    });

    await prisma.communityComment.update({
      where: { id: commentId },
      data: { likeCount: { increment: 1 } },
    });

    // Award karma to comment author when someone likes their comment (skip AI comments)
    const comment = await prisma.communityComment.findUnique({
      where: { id: commentId },
      select: { authorId: true, authorType: true },
    });
    if (comment && comment.authorId !== userId && comment.authorType !== "ai") {
      const settings = await getKarmaSettings();
      await recordKarmaEarned(comment.authorId, settings.likeReceived, "comment_like_received");
    }

    return { liked: true };
  }
}

// Get comments for a post with all nested replies
export async function getComments(postId: string, cursor?: string) {
  const { userId } = auth();

  // Load comments for the post (capped to avoid unbounded slow queries)
  const allComments = await prisma.communityComment.findMany({
    where: {
      postId,
      isDeleted: false,
    },
    take: 200,
    include: {
      likes: userId ? {
        where: { userId },
        select: { id: true },
      } : false,
      _count: {
        select: { replies: { where: { isDeleted: false } } },
      },
    },
    orderBy: { createdAt: "asc" }, // Oldest first for proper nesting
  });

  // Get unique author IDs to fetch current profile avatars, streaks and karma
  const authorIds = [...new Set(allComments.map(c => c.authorId))];
  const authorProfiles = await prisma.userCommunityProfile.findMany({
    where: { userId: { in: authorIds } },
    select: { userId: true, avatar: true, customAvatar: true },
  });
  const avatarMap = new Map(authorProfiles.map(p => [p.userId, p.avatar]));
  const customAvatarMap = new Map(authorProfiles.map(p => [p.userId, p.customAvatar]));

  const streakRows = await prisma.userCommunityProfile.findMany({
    where: { userId: { in: authorIds } },
    select: { userId: true, currentStreak: true, karmaPoints: true },
  });
  const streakMap = new Map(streakRows.map((r) => [r.userId, Number(r.currentStreak) || 0]));
  const karmaMap = new Map(streakRows.map((r) => [r.userId, Number(r.karmaPoints) || 0]));

  // Build nested tree structure
  const commentMap = new Map();
  const rootComments: any[] = [];

  // First pass: create map and clean up data, using current profile avatar
  allComments.forEach((comment) => {
    const cleanComment = {
      ...comment,
      // Use custom avatar if set, otherwise fall back to regular avatar or static authorImage
      authorImage: customAvatarMap.get(comment.authorId) || avatarMap.get(comment.authorId) || comment.authorImage,
      authorAvatar: avatarMap.get(comment.authorId) || null,
      authorCustomAvatar: customAvatarMap.get(comment.authorId) || null,
      authorStreak: streakMap.get(comment.authorId) || 0,
      authorKarma: karmaMap.get(comment.authorId) || 0,
      hasLiked: comment.likes && comment.likes.length > 0,
      likes: undefined,
      replyCount: comment._count.replies,
      _count: undefined,
      replies: [],
    };
    commentMap.set(comment.id, cleanComment);
  });

  // Second pass: build tree
  allComments.forEach((comment) => {
    const cleanComment = commentMap.get(comment.id);
    if (comment.parentId && commentMap.has(comment.parentId)) {
      // Add to parent's replies
      const parent = commentMap.get(comment.parentId);
      parent.replies.push(cleanComment);
    } else {
      // Top-level comment
      rootComments.push(cleanComment);
    }
  });

  // Sort root comments by date (newest first)
  rootComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Pagination for root comments only
  let hasMore = false;
  let paginatedRoots = rootComments;
  let nextCursor = null;

  if (cursor) {
    const cursorIndex = rootComments.findIndex((c) => c.id === cursor);
    if (cursorIndex !== -1) {
      paginatedRoots = rootComments.slice(cursorIndex + 1, cursorIndex + 1 + COMMENTS_PER_PAGE);
    } else {
      paginatedRoots = rootComments.slice(0, COMMENTS_PER_PAGE);
    }
  } else {
    paginatedRoots = rootComments.slice(0, COMMENTS_PER_PAGE);
  }

  if (rootComments.length > (cursor ? rootComments.findIndex((c) => c.id === cursor) + 1 + COMMENTS_PER_PAGE : COMMENTS_PER_PAGE)) {
    hasMore = true;
    nextCursor = paginatedRoots[paginatedRoots.length - 1]?.id || null;
  }

  return {
    comments: paginatedRoots,
    nextCursor,
    hasMore,
  };
}

// Get replies for a specific comment
export async function getReplies(commentId: string, cursor?: string) {
  const { userId } = auth();

  const replies = await prisma.communityComment.findMany({
    where: {
      parentId: commentId,
      isDeleted: false,
    },
    include: {
      likes: userId ? {
        where: { userId },
        select: { id: true },
      } : false,
    },
    orderBy: { createdAt: "asc" },
    take: COMMENTS_PER_PAGE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  let hasMore = false;
  if (replies.length > COMMENTS_PER_PAGE) {
    replies.pop();
    hasMore = true;
  }

  const nextCursor = hasMore && replies.length > 0 ? replies[replies.length - 1].id : null;

  // Fetch author avatars, streaks and karma for replies
  const replyAuthorIds = [...new Set(replies.map(r => r.authorId))];
  const replyAuthorProfiles = await prisma.userCommunityProfile.findMany({
    where: { userId: { in: replyAuthorIds } },
    select: { userId: true, avatar: true, customAvatar: true },
  });
  const replyAvatarMap = new Map(replyAuthorProfiles.map(p => [p.userId, p.avatar]));
  const replyCustomAvatarMap = new Map(replyAuthorProfiles.map(p => [p.userId, p.customAvatar]));
  const replyStreakRows = await prisma.userCommunityProfile.findMany({
    where: { userId: { in: replyAuthorIds } },
    select: { userId: true, currentStreak: true, karmaPoints: true },
  });
  const replyStreakMap = new Map(replyStreakRows.map((r) => [r.userId, Number(r.currentStreak) || 0]));
  const replyKarmaMap = new Map(replyStreakRows.map((r) => [r.userId, Number(r.karmaPoints) || 0]));

  return {
    replies: replies.map(reply => ({
      ...reply,
      authorImage: replyCustomAvatarMap.get(reply.authorId) || replyAvatarMap.get(reply.authorId) || reply.authorImage,
      authorAvatar: replyAvatarMap.get(reply.authorId) || null,
      authorCustomAvatar: replyCustomAvatarMap.get(reply.authorId) || null,
      authorStreak: replyStreakMap.get(reply.authorId) || 0,
      authorKarma: replyKarmaMap.get(reply.authorId) || 0,
      hasLiked: reply.likes && reply.likes.length > 0,
      likes: undefined,
    })),
    nextCursor,
    hasMore,
  };
}

// Mark an answer as helpful (rank 1=Best, 2=Helpful, 3=Promising)
// Only the original post author can do this, and max 3 answers per post
export async function markHelpfulAnswer(commentId: string, rank: 1 | 2 | 3) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  if (![1, 2, 3].includes(rank)) {
    throw new Error("Invalid rank. Must be 1 (Best), 2 (Helpful), or 3 (Promising)");
  }

  const comment = await prisma.communityComment.findUnique({
    where: { id: commentId },
    include: { post: true },
  });

  if (!comment) throw new Error("Answer not found");
  if (comment.post.authorId !== userId) {
    throw new Error("Only the question author can mark helpful answers");
  }
  if (comment.parentId) {
    throw new Error("Only top-level answers can be marked as helpful");
  }

  // Check if this rank is already assigned to another comment on this post
  const existingAtRank = await prisma.communityComment.findFirst({
    where: { postId: comment.postId, helpfulRank: rank, isDeleted: false },
  });

  if (existingAtRank && existingAtRank.id !== commentId) {
    throw new Error(`Rank ${rank} is already assigned to another answer. Unmark it first.`);
  }

  const settings = await getKarmaSettings();
  const karmaMap: Record<number, number> = {
    1: settings.bestAnswerKarma,
    2: settings.helpfulAnswerKarma,
    3: settings.promisingAnswerKarma,
  };
  const karmaAmount = karmaMap[rank];

  // If this comment already had a different rank, revoke old karma first (skip AI authors)
  if (comment.helpfulRank && comment.helpfulRank !== rank && comment.authorType !== "ai") {
    const oldKarma = karmaMap[comment.helpfulRank] || 0;
    if (oldKarma > 0 && comment.karmaAwarded > 0) {
      // We don't subtract from history, but we update the comment record
      await recordKarmaEarned(comment.authorId, -oldKarma, `answer_unmarked_rank_${comment.helpfulRank}`);
    }
  }

  // Update comment with new rank and karma
  await prisma.communityComment.update({
    where: { id: commentId },
    data: {
      helpfulRank: rank,
      karmaAwarded: karmaAmount,
    },
  });

  // Award karma to answer author (skip AI authors)
  if (comment.authorType !== "ai") {
    await recordKarmaEarned(comment.authorId, karmaAmount, `answer_marked_rank_${rank}`);
  }

  // Update post answered status
  const helpfulCount = await prisma.communityComment.count({
    where: { postId: comment.postId, helpfulRank: { not: null }, isDeleted: false },
  });

  if (helpfulCount > 0 && !comment.post.isAnswered) {
    await prisma.communityPost.update({
      where: { id: comment.postId },
      data: { isAnswered: true },
    });
  }

  revalidatePath(`/community/post/${comment.postId}`);
  revalidatePath("/community");

  return { success: true, rank, karmaAwarded: karmaAmount };
}

// Unmark a helpful answer (only post author)
export async function unmarkHelpfulAnswer(commentId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const comment = await prisma.communityComment.findUnique({
    where: { id: commentId },
    include: { post: true },
  });

  if (!comment) throw new Error("Answer not found");
  if (comment.post.authorId !== userId) {
    throw new Error("Only the question author can unmark helpful answers");
  }
  if (!comment.helpfulRank) {
    throw new Error("This answer is not marked as helpful");
  }

  const settings = await getKarmaSettings();
  const karmaMap: Record<number, number> = {
    1: settings.bestAnswerKarma,
    2: settings.helpfulAnswerKarma,
    3: settings.promisingAnswerKarma,
  };
  const oldKarma = karmaMap[comment.helpfulRank] || 0;

  // Revoke karma (negative) only for human authors
  if (oldKarma > 0 && comment.authorType !== "ai") {
    await recordKarmaEarned(comment.authorId, -oldKarma, `answer_unmarked_rank_${comment.helpfulRank}`);
  }

  await prisma.communityComment.update({
    where: { id: commentId },
    data: { helpfulRank: null, karmaAwarded: 0 },
  });

  // Update post answered status if no helpful answers remain
  const helpfulCount = await prisma.communityComment.count({
    where: { postId: comment.postId, helpfulRank: { not: null }, isDeleted: false },
  });

  if (helpfulCount === 0 && comment.post.isAnswered) {
    await prisma.communityPost.update({
      where: { id: comment.postId },
      data: { isAnswered: false },
    });
  }

  revalidatePath(`/community/post/${comment.postId}`);
  revalidatePath("/community");

  return { success: true };
}

// Get helpful answers for a post
export async function getHelpfulAnswers(postId: string) {
  const answers = await prisma.communityComment.findMany({
    where: { postId, helpfulRank: { not: null }, isDeleted: false },
    orderBy: { helpfulRank: "asc" },
    include: {
      likes: { select: { id: true } },
      _count: { select: { replies: { where: { isDeleted: false } } } },
    },
  });

  const authorIds = [...new Set(answers.map(a => a.authorId))];
  const authorProfiles = await prisma.userCommunityProfile.findMany({
    where: { userId: { in: authorIds } },
    select: { userId: true, avatar: true, customAvatar: true, karmaPoints: true, username: true, displayName: true },
  });
  const profileMap = new Map(authorProfiles.map(p => [p.userId, p]));

  return answers.map(answer => {
    const profile = profileMap.get(answer.authorId);
    return {
      ...answer,
      authorImage: profile?.customAvatar || profile?.avatar || answer.authorImage,
      authorUsername: profile?.username || answer.authorId,
      authorDisplayName: profile?.displayName || answer.authorName,
      karmaPoints: profile?.karmaPoints || 0,
      hasLiked: false,
      likes: undefined,
      _count: undefined,
    };
  });
}
