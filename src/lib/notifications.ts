import prisma from "@/lib/prisma";

type TargetRole = "teacher" | "student" | "parent" | "admin";

export async function createNotificationsForUsers({
  title,
  message,
  type = "GENERIC",
  entityId,
  changes = null,
  teacherIds = [],
  studentIds = [],
  parentIds = [],
  adminIds = [],
  excludeUserId = null,
}: {
  title: string;
  message: string;
  type?: string;
  entityId?: string;
  changes?: any[] | null;
  teacherIds?: string[];
  studentIds?: string[];
  parentIds?: string[];
  adminIds?: string[];
  excludeUserId?: string | null;
}) {
  const data: any[] = [];

  for (const id of teacherIds) if (id !== excludeUserId) data.push({ title, message, type, entityId, changes, teacherId: id });
  for (const id of studentIds) if (id !== excludeUserId) data.push({ title, message, type, entityId, changes, studentId: id });
  for (const id of parentIds) if (id !== excludeUserId) data.push({ title, message, type, entityId, changes, parentId: id });
  for (const id of adminIds) if (id !== excludeUserId) data.push({ title, message, type, entityId, changes, adminId: id });

  if (data.length === 0) return;

  await prisma.notification.createMany({ data });
}

export async function getAllUserIdsByRole(role: TargetRole) {
  if (role === "teacher") {
    const rows = await prisma.teacher.findMany({ select: { id: true } });
    return rows.map((r) => r.id);
  }
  if (role === "student") {
    const rows = await prisma.student.findMany({ select: { id: true } });
    return rows.map((r) => r.id);
  }
  if (role === "parent") {
    const rows = await prisma.parent.findMany({ select: { id: true } });
    return rows.map((r) => r.id);
  }
  const rows = await prisma.admin.findMany({ select: { id: true } });
  return rows.map((r) => r.id);
}

