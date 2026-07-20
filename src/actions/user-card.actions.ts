"use server";

import prisma from "@/lib/prisma";
import { auth, clerkClient } from "@clerk/nextjs/server";

export interface UserCardData {
  userId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  customAvatar: string | null;
  bannerUrl: string | null;
  bio: string | null;
  karmaPoints: number;
  postCount: number;
  followerCount: number;
  followingCount: number;
  isPrivate: boolean;
  requireFollowApproval: boolean;
  // Equipped items
  equippedUsernameColor: string | null;
  equippedNameplate: string | null;
  profileBgColor: string | null;
  // Status
  isFollowing: boolean;
  isOwnProfile: boolean;
  hasDMAccess: boolean;
  hasPendingDMRequest: boolean;
  hasPendingFollowRequest: boolean;
  // Streak
  currentStreak: number;
  // Mutual
  mutualServers: Array<{
    id: string;
    name: string;
    iconUrl: string | null;
    targetRoles: Array<{
      id: string;
      name: string;
      color: string | null;
      iconUrl: string | null;
    }>;
  }>;
  mutualGroups: Array<{
    id: number;
    name: string;
  }>;
}

export async function getUserCardData(targetUserId: string): Promise<UserCardData | null> {
  try {
    const { userId: currentUserId } = auth();
    
    if (!currentUserId) {
      console.error("[getUserCardData] No current user ID (unauthorized)");
      return null;
    }

    if (!targetUserId) {
      console.error("[getUserCardData] No target user ID provided");
      return null;
    }

    // Get target user profile
    const profile = await prisma.userCommunityProfile.findUnique({
      where: { userId: targetUserId },
    });

    if (!profile) {
      console.error("[getUserCardData] No profile found for userId:", targetUserId);
      return null;
    }

  // Sync username/displayName from Clerk if the profile still has a default handle
  let profileUsername = profile.username;
  let profileDisplayName = profile.displayName;
  try {
    const normalizedStored = (profileUsername || "").toLowerCase();
    const isDefaultUsername =
      !profileUsername ||
      normalizedStored.startsWith("user_") ||
      normalizedStored === targetUserId.toLowerCase();

    if (isDefaultUsername) {
      const clerkUser = await clerkClient().users.getUser(targetUserId);
      const clerkUsername = clerkUser?.username;
      const clerkDisplayName = clerkUser?.fullName || clerkUsername || null;

      if (clerkUsername) {
        if (clerkUsername.toLowerCase() !== normalizedStored) {
          await prisma.userCommunityProfile.update({
            where: { userId: targetUserId },
            data: {
              username: clerkUsername.toLowerCase(),
              ...(profileDisplayName ? {} : { displayName: clerkDisplayName }),
            },
          });
          profileUsername = clerkUsername.toLowerCase();
        }
        if (!profileDisplayName && clerkDisplayName) {
          profileDisplayName = clerkDisplayName;
        }
      }
    }
  } catch {
    // Non-fatal: leave stored username/displayName as-is
  }

  // Check for active impersonation
  const impersonation = await prisma.userImpersonation.findUnique({
    where: { userId: targetUserId },
  });

  let appearanceUserId = targetUserId;
  if (impersonation && impersonation.expiresAt >= new Date()) {
    appearanceUserId = impersonation.targetUserId;
  } else if (impersonation && impersonation.expiresAt < new Date()) {
    // clean up expired
    await prisma.userImpersonation.delete({ where: { userId: targetUserId } }).catch(() => {});
  }

  // Get streak and appearance from the impersonated profile if applicable
  let appearanceProfile = profile;
  if (appearanceUserId !== targetUserId) {
    const impProfile = await prisma.userCommunityProfile.findUnique({
      where: { userId: appearanceUserId }
    });
    if (impProfile) {
      appearanceProfile = impProfile;
    }
  }

  // Get equipped colors - query related items separately since schema may vary
  const equipped = await prisma.userEquippedColors.findUnique({
    where: { userId: appearanceUserId },
  });

  // Fetch the actual color/nameplate items
  const [usernameColorItem, nameplateItem, profileBgItem] = await Promise.all([
    equipped?.usernameColorId 
      ? prisma.usernameColorShopItem.findUnique({ where: { id: equipped.usernameColorId } })
      : null,
    equipped?.nameplateId
      ? prisma.usernameColorShopItem.findUnique({ where: { id: equipped.nameplateId } })
      : null,
    equipped?.profileBgColorId
      ? prisma.usernameColorShopItem.findUnique({ where: { id: equipped.profileBgColorId } })
      : null,
  ]);

  // Check follow status
  const followRecord = currentUserId !== targetUserId
    ? await prisma.communityFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: targetUserId,
          },
        },
      })
    : null;

  // Check pending follow request
  const pendingFollowRequest = currentUserId !== targetUserId
    ? await prisma.followRequest.findUnique({
        where: {
          requesterId_targetId: {
            requesterId: currentUserId,
            targetId: targetUserId,
          },
        },
      })
    : null;

  // Check DM access
  const user1Id = currentUserId < targetUserId ? currentUserId : targetUserId;
  const user2Id = currentUserId < targetUserId ? targetUserId : currentUserId;
  
  const dmGrant = currentUserId !== targetUserId
    ? await prisma.dMAccessGrant.findUnique({
        where: {
          user1Id_user2Id: {
            user1Id,
            user2Id,
          },
        },
      })
    : null;

  // Check pending DM request
  const pendingDMRequest = currentUserId !== targetUserId
    ? await prisma.dMAccessRequest.findUnique({
        where: {
          requesterId_targetId: {
            requesterId: currentUserId,
            targetId: targetUserId,
          },
        },
      })
    : null;

  // Get mutual servers
  const [currentUserServers, targetUserServers] = await Promise.all([
    prisma.serverMember.findMany({
      where: { userId: currentUserId },
      select: { serverId: true },
    }),
    prisma.serverMember.findMany({
      where: { userId: targetUserId },
      select: { serverId: true },
    }),
  ]);

  const currentUserServerIds = new Set(currentUserServers.map(s => s.serverId));
  const targetUserServerIds = new Set(targetUserServers.map(s => s.serverId));
  const mutualServerIds = [...currentUserServerIds].filter(id => targetUserServerIds.has(id));

  // Fetch mutual servers with target user's custom roles
  const mutualServers = mutualServerIds.length > 0
    ? await Promise.all(
        mutualServerIds.map(async (serverId) => {
          const server = await prisma.server.findUnique({
            where: { id: serverId },
            select: { id: true, name: true, iconUrl: true },
          });
          if (!server) return null;

          const targetMember = await prisma.serverMember.findUnique({
            where: { serverId_userId: { serverId, userId: targetUserId } },
            include: {
              roles: {
                include: { role: true },
                orderBy: { role: { position: "desc" } },
              },
            },
          });

          return {
            ...server,
            targetRoles: (targetMember?.roles || []).map((mr: any) => ({
              id: mr.role.id,
              name: mr.role.name,
              color: mr.role.color,
              iconUrl: mr.role.iconUrl,
            })),
          };
        })
      ).then((results) => results.filter(Boolean) as any)
    : [];

  // Get mutual groups
  const [currentUserGroups, targetUserGroups] = await Promise.all([
    prisma.groupMember.findMany({
      where: { userId: currentUserId },
      select: { groupId: true },
    }),
    prisma.groupMember.findMany({
      where: { userId: targetUserId },
      select: { groupId: true },
    }),
  ]);

  const currentUserGroupIds = new Set(currentUserGroups.map(g => g.groupId));
  const targetUserGroupIds = new Set(targetUserGroups.map(g => g.groupId));
  const mutualGroupIds = [...currentUserGroupIds].filter(id => targetUserGroupIds.has(id));

  const mutualGroups = mutualGroupIds.length > 0
    ? await prisma.groupChat.findMany({
        where: { id: { in: mutualGroupIds } },
        select: { id: true, name: true },
        take: 5,
      })
    : [];

  // Check if target has pending request FROM current user
  const outgoingFollowPending = pendingFollowRequest?.status === "PENDING";
  
  // Check for incoming follow request (target sent to current user)
  const incomingFollowRequest = currentUserId !== targetUserId
    ? await prisma.followRequest.findUnique({
        where: {
          requesterId_targetId: {
            requesterId: targetUserId,
            targetId: currentUserId,
          },
        },
      })
    : null;

    return {
      userId: profile.userId,
      username: profileUsername,
      displayName: profileDisplayName,
      avatar: appearanceProfile.avatar,
      customAvatar: appearanceProfile.customAvatar,
      bannerUrl: appearanceProfile.bannerUrl,
      bio: profile.bio,
      karmaPoints: profile.karmaPoints,
      postCount: profile.postCount,
      followerCount: profile.followerCount,
      followingCount: profile.followingCount,
      isPrivate: profile.isPrivate,
      requireFollowApproval: profile.requireFollowApproval,
      equippedUsernameColor: usernameColorItem?.colorValue || null,
      equippedNameplate: nameplateItem?.colorValue || null,
      profileBgColor: profileBgItem?.colorValue || null,
      isFollowing: !!followRecord,
      isOwnProfile: currentUserId === targetUserId,
      hasDMAccess: !!dmGrant || (!profile.isPrivate && !profile.requireFollowApproval),
      hasPendingDMRequest: pendingDMRequest?.status === "PENDING",
      hasPendingFollowRequest: outgoingFollowPending || incomingFollowRequest?.status === "PENDING",
      currentStreak: (appearanceProfile as any).currentStreak || 0,
      mutualServers,
      mutualGroups,
    };
  } catch (err) {
    console.error("[getUserCardData] Unexpected error for targetUserId:", targetUserId, err);
    return null;
  }
}
