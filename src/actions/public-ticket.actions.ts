"use server";

import prisma from "../lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createNotificationsForUsers, getAllUserIdsByRole } from "@/lib/notifications";

export async function createPublicTicket(data: {
  type: string;
  subject: string;
  description: string;
  desiredUsername?: string;
  desiredRole?: string;
  contactEmail?: string;
  userAccessCode?: string;
}) {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const code = Math.random().toString(36).substring(2, 10).toUpperCase();

  const ticket = await prisma.publicTicket.create({
    data: {
      code,
      type: data.type,
      subject: data.subject,
      description: data.description,
      desiredUsername: data.desiredUsername,
      desiredRole: data.desiredRole,
      contactEmail: data.contactEmail,
      submitterUserId: userId || null,
      submitterRole: role || null,
      messages: {
        create: {
          content: data.description,
          senderId: userId || "guest",
          senderRole: role || "guest",
          isAdminReply: false,
        },
      },
    },
  });

  const adminIds = await getAllUserIdsByRole("admin");
  await createNotificationsForUsers({
    title: "New public ticket",
    message: data.subject,
    type: "TICKET_CREATED",
    entityId: String(ticket.id),
    adminIds,
  });

  return { code: ticket.code };
}

export async function getPublicTicketByCode(code: string) {
  return await prisma.publicTicket.findUnique({
    where: { code },
    include: {
      messages: {
        include: {
          reactions: true,
          replyTo: {
            select: {
              id: true,
              content: true,
              senderId: true,
              senderRole: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function getAllPublicTickets() {
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") throw new Error("Unauthorized");

  return await prisma.publicTicket.findMany({
    include: {
      messages: {
        include: {
          reactions: true,
          replyTo: {
            select: {
              id: true,
              content: true,
              senderId: true,
              senderRole: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function replyToPublicTicket(ticketId: number, content: string, replyToId?: number) {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") throw new Error("Unauthorized");

  await prisma.publicTicketMessage.create({
    data: {
      content,
      ticketId,
      senderId: userId!,
      senderRole: role,
      isAdminReply: true,
      replyToId: replyToId || null,
    },
  });

  revalidatePath("/admin/public-tickets");
}

export async function guestReplyToPublicTicket(code: string, content: string, replyToId?: number) {
  const ticket = await prisma.publicTicket.findUnique({ where: { code } });
  if (!ticket) throw new Error("Ticket not found");
  if (ticket.status === "CLOSED" || ticket.status === "RESOLVED") {
    throw new Error("This ticket is resolved or closed.");
  }

  await prisma.publicTicketMessage.create({
    data: {
      content,
      ticketId: ticket.id,
      senderId: ticket.submitterUserId || "guest",
      senderRole: ticket.submitterRole || "guest",
      isAdminReply: false,
      replyToId: replyToId || null,
    },
  });

  revalidatePath("/tickets");
}

export async function deletePublicTicketMessage(messageId: number, code?: string) {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId && role !== "admin") throw new Error("Unauthorized");

  const msg = await prisma.publicTicketMessage.findUnique({
    where: { id: messageId },
    include: { ticket: true },
  });
  if (!msg) throw new Error("Message not found");

  const canDelete =
    role === "admin" ||
    (!!userId && msg.ticket.submitterUserId === userId) ||
    (!!code && msg.ticket.code === code);
  if (!canDelete) throw new Error("Unauthorized");

  await prisma.publicTicketMessage.delete({ where: { id: messageId } });
  revalidatePath("/admin/public-tickets");
  revalidatePath("/tickets");
}

export async function updatePublicTicketStatus(id: number, status: "OPEN" | "RESOLVED" | "CLOSED") {
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") throw new Error("Unauthorized");

  const ticket = await prisma.publicTicket.update({
    where: { id },
    data: { status },
    select: { subject: true, submitterUserId: true, submitterRole: true },
  });

  await createNotificationsForUsers({
    title: "Public ticket updated",
    message: `${ticket.subject} status changed to ${status}.`,
    type: "TICKET_UPDATED",
    entityId: String(id),
    studentIds: ticket.submitterRole === "student" && ticket.submitterUserId ? [ticket.submitterUserId] : [],
    teacherIds: ticket.submitterRole === "teacher" && ticket.submitterUserId ? [ticket.submitterUserId] : [],
    parentIds: ticket.submitterRole === "parent" && ticket.submitterUserId ? [ticket.submitterUserId] : [],
  });

  revalidatePath("/admin/public-tickets");
}

export async function togglePublicTicketMessageReaction(messageId: number, emoji: string, userId: string) {
  const existing = await prisma.publicTicketMessageReaction.findUnique({
    where: {
      messageId_userId_emoji: {
        messageId,
        userId,
        emoji,
      },
    },
  });

  if (existing) {
    await prisma.publicTicketMessageReaction.delete({
      where: { id: existing.id },
    });
  } else {
    await prisma.publicTicketMessageReaction.create({
      data: {
        messageId,
        userId,
        emoji,
      },
    });
  }

  revalidatePath("/admin/public-tickets");
  revalidatePath("/tickets");
}
