"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createNotificationsForUsers } from "@/lib/notifications";

// Request DM access from a user
export async function requestDMAccess(targetUserId: string, message?: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  if (userId === targetUserId) throw new Error("Cannot request DM access to yourself");

  // Check if there's already an active grant
  const existingGrant = await prisma.dMAccessGrant.findUnique({
    where: {
      user1Id_user2Id: {
        user1Id: userId < targetUserId ? userId : targetUserId,
        user2Id: userId < targetUserId ? targetUserId : userId,
      },
    },
  });

  if (existingGrant) {
    return { success: false, error: "You already have DM access to this user" };
  }

  // Check if there's already a pending request
  const existingRequest = await prisma.dMAccessRequest.findUnique({
    where: {
      requesterId_targetId: {
        requesterId: userId,
        targetId: targetUserId,
      },
    },
  });

  if (existingRequest) {
    if (existingRequest.status === "PENDING") {
      return { success: false, error: "You already have a pending request to this user" };
    }
    // If previous request was declined/revoked, we can create a new one
    if (existingRequest.status === "DECLINED" || existingRequest.status === "REVOKED") {
      await prisma.dMAccessRequest.delete({
        where: { id: existingRequest.id },
      });
    }
  }

  // Create the request
  const request = await prisma.dMAccessRequest.create({
    data: {
      requesterId: userId,
      targetId: targetUserId,
      message: message || null,
    },
    include: {
      requester: {
        select: {
          username: true,
          displayName: true,
        },
      },
    },
  });

  // Create notification for target user
  await createNotificationsForUsers({
    title: "New DM Request",
    message: `${request.requester.displayName || request.requester.username} wants to message you`,
    type: "DM_REQUEST_RECEIVED",
    entityId: request.id,
    // Send to target user based on their role
    ...await getUserNotificationIds(targetUserId),
  });

  revalidatePath("/requests");
  return { success: true, requestId: request.id };
}

// Get incoming DM access requests
export async function getDMAccessRequests() {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const requests = await prisma.dMAccessRequest.findMany({
    where: {
      targetId: userId,
      status: "PENDING",
    },
    include: {
      requester: {
        select: {
          userId: true,
          username: true,
          displayName: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return requests;
}

// Get outgoing DM access requests
export async function getSentDMAccessRequests() {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const requests = await prisma.dMAccessRequest.findMany({
    where: {
      requesterId: userId,
      status: "PENDING",
    },
    include: {
      target: {
        select: {
          userId: true,
          username: true,
          displayName: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return requests;
}

// Accept a DM access request
export async function acceptDMAccessRequest(requestId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const request = await prisma.dMAccessRequest.findUnique({
    where: { id: requestId },
    include: {
      requester: {
        select: {
          username: true,
          displayName: true,
        },
      },
    },
  });

  if (!request) throw new Error("Request not found");
  if (request.targetId !== userId) throw new Error("Unauthorized");
  if (request.status !== "PENDING") throw new Error("Request is not pending");

  // Update request status
  await prisma.dMAccessRequest.update({
    where: { id: requestId },
    data: { status: "APPROVED" },
  });

  // Create access grant
  const user1Id = request.requesterId < request.targetId ? request.requesterId : request.targetId;
  const user2Id = request.requesterId < request.targetId ? request.targetId : request.requesterId;

  await prisma.dMAccessGrant.create({
    data: {
      user1Id,
      user2Id,
      grantedBy: userId,
    },
  });

  // Notify requester
  await createNotificationsForUsers({
    title: "DM Request Accepted",
    message: `You can now message ${request.requester.displayName || request.requester.username}`,
    type: "DM_REQUEST_ACCEPTED",
    entityId: requestId,
    ...await getUserNotificationIds(request.requesterId),
  });

  revalidatePath("/requests");
  return { success: true };
}

// Decline a DM access request
export async function declineDMAccessRequest(requestId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const request = await prisma.dMAccessRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) throw new Error("Request not found");
  if (request.targetId !== userId) throw new Error("Unauthorized");
  if (request.status !== "PENDING") throw new Error("Request is not pending");

  await prisma.dMAccessRequest.update({
    where: { id: requestId },
    data: { status: "DECLINED" },
  });

  // Notify requester
  await createNotificationsForUsers({
    title: "DM Request Declined",
    message: "Your DM request was declined",
    type: "DM_REQUEST_DECLINED",
    entityId: requestId,
    ...await getUserNotificationIds(request.requesterId),
  });

  revalidatePath("/requests");
  return { success: true };
}

// Cancel an outgoing DM access request
export async function cancelDMAccessRequest(requestId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const request = await prisma.dMAccessRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) throw new Error("Request not found");
  if (request.requesterId !== userId) throw new Error("Unauthorized");
  if (request.status !== "PENDING") throw new Error("Request is not pending");

  await prisma.dMAccessRequest.delete({
    where: { id: requestId },
  });

  revalidatePath("/requests");
  return { success: true };
}

// Revoke DM access
export async function revokeDMAccess(targetUserId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const user1Id = userId < targetUserId ? userId : targetUserId;
  const user2Id = userId < targetUserId ? targetUserId : userId;

  // Find and delete the grant
  const grant = await prisma.dMAccessGrant.findUnique({
    where: {
      user1Id_user2Id: {
        user1Id,
        user2Id,
      },
    },
  });

  if (!grant) {
    return { success: false, error: "No DM access found" };
  }

  await prisma.dMAccessGrant.delete({
    where: { id: grant.id },
  });

  // Create or update request to revoked status
  await prisma.dMAccessRequest.upsert({
    where: {
      requesterId_targetId: {
        requesterId: grant.grantedBy === userId ? targetUserId : userId,
        targetId: grant.grantedBy === userId ? userId : targetUserId,
      },
    },
    update: {
      status: "REVOKED",
    },
    create: {
      requesterId: userId,
      targetId: targetUserId,
      status: "REVOKED",
    },
  });

  // Notify the other user
  const otherUserId = grant.grantedBy === userId ? targetUserId : grant.grantedBy;
  if (otherUserId) {
    await createNotificationsForUsers({
      title: "DM Access Revoked",
      message: "Your DM access has been revoked",
      type: "DM_ACCESS_REVOKED",
      entityId: userId,
      ...await getUserNotificationIds(otherUserId),
    });
  }

  revalidatePath("/requests");
  revalidatePath("/messages");
  return { success: true };
}

// Check if current user has DM access to target user
export async function checkDMAccess(targetUserId: string) {
  const { userId } = auth();
  if (!userId) return { hasAccess: false, isPending: false };

  if (userId === targetUserId) return { hasAccess: true, isPending: false };

  const user1Id = userId < targetUserId ? userId : targetUserId;
  const user2Id = userId < targetUserId ? targetUserId : userId;

  const grant = await prisma.dMAccessGrant.findUnique({
    where: {
      user1Id_user2Id: {
        user1Id,
        user2Id,
      },
    },
  });

  if (grant) {
    return { hasAccess: true, isPending: false, grant };
  }

  // Check for pending request from current user to target
  const pendingRequest = await prisma.dMAccessRequest.findUnique({
    where: {
      requesterId_targetId: {
        requesterId: userId,
        targetId: targetUserId,
      },
    },
  });

  if (pendingRequest?.status === "PENDING") {
    return { hasAccess: false, isPending: true, request: pendingRequest };
  }

  return { hasAccess: false, isPending: false };
}

// Get all active DM access grants for current user
export async function getDMGrants() {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const grants = await prisma.dMAccessGrant.findMany({
    where: {
      OR: [
        { user1Id: userId },
        { user2Id: userId },
      ],
    },
    orderBy: { grantedAt: "desc" },
  });

  // Get user info for each grant
  const grantsWithUserInfo = await Promise.all(
    grants.map(async (grant) => {
      const otherUserId = grant.user1Id === userId ? grant.user2Id : grant.user1Id;
      const user = await prisma.userCommunityProfile.findUnique({
        where: { userId: otherUserId },
        select: {
          userId: true,
          username: true,
          displayName: true,
          avatar: true,
        },
      });
      return {
        ...grant,
        otherUser: user,
      };
    })
  );

  return grantsWithUserInfo;
}

// Check if there's a pending DM request (either direction)
export async function getPendingDMRequest(targetUserId: string) {
  const { userId } = auth();
  if (!userId) return null;

  if (userId === targetUserId) return null;

  // Check for request from current user to target
  const outgoingRequest = await prisma.dMAccessRequest.findUnique({
    where: {
      requesterId_targetId: {
        requesterId: userId,
        targetId: targetUserId,
      },
    },
  });

  if (outgoingRequest?.status === "PENDING") {
    return { type: "outgoing", request: outgoingRequest };
  }

  // Check for request from target to current user
  const incomingRequest = await prisma.dMAccessRequest.findUnique({
    where: {
      requesterId_targetId: {
        requesterId: targetUserId,
        targetId: userId,
      },
    },
  });

  if (incomingRequest?.status === "PENDING") {
    return { type: "incoming", request: incomingRequest };
  }

  return null;
}

// Cancel a pending DM request
export async function cancelDMRequest(targetUserId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const request = await prisma.dMAccessRequest.findUnique({
    where: {
      requesterId_targetId: {
        requesterId: userId,
        targetId: targetUserId,
      },
    },
  });

  if (!request) {
    throw new Error("Request not found");
  }

  if (request.status !== "PENDING") {
    throw new Error("Can only cancel pending requests");
  }

  await prisma.dMAccessRequest.update({
    where: { id: request.id },
    data: { status: "CANCELLED" },
  });

  // Delete any related notification
  await prisma.notification.deleteMany({
    where: {
      type: "DM_REQUEST_RECEIVED",
      userId: targetUserId,
      entityId: request.id,
    },
  });

  revalidatePath("/requests");
  revalidatePath(`/${targetUserId}`);

  return { success: true };
}

// Helper to get notification IDs based on user lookup
async function getUserNotificationIds(userId: string) {
  // Check user type by looking up in various tables
  const student = await prisma.student.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (student) return { studentIds: [userId] };

  const teacher = await prisma.teacher.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (teacher) return { teacherIds: [userId] };

  const parent = await prisma.parent.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (parent) return { parentIds: [userId] };

  const admin = await prisma.admin.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (admin) return { adminIds: [userId] };

  return {};
}
