"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { awardGecXForAttendance } from "./gecx.actions";

export type BulkAttendanceEntry = {
  studentId: string;
  present: boolean;
};

/**
 * Bulk-upsert attendance for a lesson on a given date.
 * Delete-then-insert so re-submitting the same day is idempotent.
 */
export async function bulkMarkAttendance(
  lessonId: number,
  date: string, // ISO date string yyyy-mm-dd
  entries: BulkAttendanceEntry[]
): Promise<{ success: boolean; error?: string }> {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId || (role !== "admin" && role !== "teacher")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const attendanceDate = new Date(date);
    attendanceDate.setUTCHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000);

    // Delete today's existing records for this lesson then re-insert
    await prisma.$transaction([
      prisma.attendance.deleteMany({
        where: {
          lessonId,
          date: { gte: attendanceDate, lt: nextDay },
        },
      }),
      prisma.attendance.createMany({
        data: entries.map((e) => ({
          date: attendanceDate,
          present: e.present,
          studentId: e.studentId,
          lessonId,
        })),
      }),
    ]);

    // Award gecX for attendance (async, don't block attendance saving)
    for (const entry of entries) {
      if (entry.present) {
        try {
          await awardGecXForAttendance(entry.studentId, attendanceDate, true);
        } catch (error) {
          console.error("Failed to award gecX for attendance:", error);
        }
      }
    }

    revalidatePath("/list/attendance");
    revalidatePath("/admin");
    revalidatePath("/teacher");
    return { success: true };
  } catch (err) {
    console.error("bulkMarkAttendance error:", err);
    return { success: false, error: "Failed to save attendance." };
  }
}

/**
 * Fetch all lessons (with class + subject) for the lesson selector.
 */
export async function getLessons() {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const where = role === "teacher" ? { teacherId: userId! } : {};

  return prisma.lesson.findMany({
    where,
    select: {
      id: true,
      name: true,
      class: { select: { id: true, name: true } },
      subject: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Fetch students in a class for the kanban board.
 */
export async function getStudentsByClass(classId: number) {
  return prisma.student.findMany({
    where: { classId },
    select: { id: true, name: true, surname: true, img: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Get existing attendance for a lesson on a date (to pre-populate the board).
 */
export async function getAttendanceForLesson(lessonId: number, date: string) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const nextDay = new Date(d.getTime() + 24 * 60 * 60 * 1000);

  return prisma.attendance.findMany({
    where: {
      lessonId,
      date: { gte: d, lt: nextDay },
    },
    select: { studentId: true, present: true },
  });
}


export type BulkTeacherAttendanceEntry = {
  teacherId: string;
  present: boolean;
};

export async function bulkMarkTeacherAttendance(
  date: string,
  entries: BulkTeacherAttendanceEntry[]
): Promise<{ success: boolean; error?: string }> {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId || role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const attendanceDate = new Date(date);
    attendanceDate.setUTCHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.teacherAttendance.deleteMany({
        where: {
          date: { gte: attendanceDate, lt: nextDay },
        },
      }),
      prisma.teacherAttendance.createMany({
        data: entries.map((e) => ({
          date: attendanceDate,
          present: e.present,
          teacherId: e.teacherId,
        })),
      }),
    ]);

    revalidatePath("/list/teacher-attendance");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error("bulkMarkTeacherAttendance error:", err);
    return { success: false, error: "Failed to save teacher attendance." };
  }
}

export async function getTeachersForAttendance() {
  return prisma.teacher.findMany({
    select: { id: true, name: true, surname: true, img: true },
    orderBy: { name: "asc" },
  });
}

export async function getTeacherAttendanceForDate(date: string) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const nextDay = new Date(d.getTime() + 24 * 60 * 60 * 1000);

  return prisma.teacherAttendance.findMany({
    where: {
      date: { gte: d, lt: nextDay },
    },
    select: { teacherId: true, present: true },
  });
}


export type ChartDataItem = {
  name: string;
  shortName: string;
  dateLabel: string;
  present: number | null;
  absent: number | null;
  leave: number | null;
  isToday: boolean;
};

export async function getAttendanceChartData(
  range: "7days" | "30days" | "1year"
): Promise<ChartDataItem[]> {
  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  if (range === "7days") {
    // Get Monday of current week
    const utcDay = startOfToday.getUTCDay();
    const daysSinceMonday = utcDay === 0 ? 6 : utcDay - 1;
    const weekMonday = new Date(startOfToday);
    weekMonday.setUTCDate(startOfToday.getUTCDate() - daysSinceMonday);
    const endOfWeek = new Date(weekMonday);
    endOfWeek.setUTCDate(weekMonday.getUTCDate() + 7);

    const resData = await prisma.attendance.findMany({
      where: { date: { gte: weekMonday, lt: endOfWeek } },
      select: { date: true, present: true },
    });

    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const isLeaveDay = [false, false, false, false, false, true, true];

    const slots = dayNames.map((dayName, i) => {
      const d = new Date(weekMonday);
      d.setUTCDate(weekMonday.getUTCDate() + i);
      const m = d.getUTCMonth() + 1;
      const dd = d.getUTCDate();
      const isToday =
        d.getUTCFullYear() === startOfToday.getUTCFullYear() &&
        d.getUTCMonth() === startOfToday.getUTCMonth() &&
        d.getUTCDate() === startOfToday.getUTCDate();

      return {
        name: `${dayName} ${m}/${dd}`,
        shortName: dayName,
        present: 0,
        absent: 0,
        leave: isLeaveDay[i],
        isToday,
        dateLabel: `${m}/${dd}`,
      };
    });

    resData.forEach((item) => {
      const d = new Date(item.date);
      const dow = d.getUTCDay();
      const idx = dow === 0 ? 6 : dow - 1;
      if (slots[idx] && !slots[idx].leave) {
        if (item.present) slots[idx].present += 1;
        else slots[idx].absent += 1;
      }
    });

    return slots.map((s) => ({
      name: s.name,
      shortName: s.shortName,
      present: s.leave ? null : s.present,
      absent: s.leave ? null : s.absent,
      leave: s.leave ? 1 : null,
      isToday: s.isToday,
      dateLabel: s.dateLabel,
    }));
  } else if (range === "30days") {
    // Last 30 days - chronological order with no x-axis labels
    const startDate = new Date(startOfToday);
    startDate.setUTCDate(startOfToday.getUTCDate() - 29);
    const endDate = new Date(startOfToday);
    endDate.setUTCDate(endDate.getUTCDate() + 1);

    const resData = await prisma.attendance.findMany({
      where: { date: { gte: startDate, lt: endDate } },
      select: { date: true, present: true },
    });

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Create slots for each day in chronological order
    const slots: Array<{
      name: string;
      shortName: string;
      present: number;
      absent: number;
      leave: boolean;
      isToday: boolean;
      dateLabel: string;
    }> = [];

    for (let i = 0; i < 30; i++) {
      const d = new Date(startDate);
      d.setUTCDate(startDate.getUTCDate() + i);
      const dow = d.getUTCDay();
      const m = d.getUTCMonth() + 1;
      const dd = d.getUTCDate();
      const isToday =
        d.getUTCFullYear() === startOfToday.getUTCFullYear() &&
        d.getUTCMonth() === startOfToday.getUTCMonth() &&
        d.getUTCDate() === startOfToday.getUTCDate();

      const isLeaveDay = dow === 0 || dow === 6;

      slots.push({
        name: `${dayNames[dow]} ${m}/${dd}`, // Day name + date for tooltip
        shortName: "", // Empty for no x-axis label
        present: 0,
        absent: 0,
        leave: isLeaveDay,
        isToday,
        dateLabel: `${m}/${dd}`,
      });
    }

    // Aggregate attendance into slots
    resData.forEach((item) => {
      const d = new Date(item.date);
      const diffTime = d.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (slots[diffDays] && !slots[diffDays].leave) {
        if (item.present) slots[diffDays].present += 1;
        else slots[diffDays].absent += 1;
      }
    });

    return slots.map((s) => ({
      name: s.name,
      shortName: s.shortName,
      present: s.leave ? null : s.present,
      absent: s.leave ? null : s.absent,
      leave: s.leave ? 1 : null,
      isToday: s.isToday,
      dateLabel: s.dateLabel,
    }));
  } else {
    // 1 year - monthly aggregates
    const startOfYear = new Date(
      Date.UTC(startOfToday.getUTCFullYear(), 0, 1)
    );
    const endOfYear = new Date(
      Date.UTC(startOfToday.getUTCFullYear() + 1, 0, 1)
    );

    const resData = await prisma.attendance.findMany({
      where: { date: { gte: startOfYear, lt: endOfYear } },
      select: { date: true, present: true },
    });

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const slots = monthNames.map((monthName, i) => {
      const isCurrentMonth = i === startOfToday.getUTCMonth();
      return {
        name: monthName,
        shortName: monthName,
        present: 0,
        absent: 0,
        leave: false,
        isToday: isCurrentMonth,
        dateLabel: monthName,
      };
    });

    resData.forEach((item) => {
      const d = new Date(item.date);
      const month = d.getUTCMonth();
      if (item.present) slots[month].present += 1;
      else slots[month].absent += 1;
    });

    return slots.map((s) => ({
      name: s.name,
      shortName: s.shortName,
      present: s.present,
      absent: s.absent,
      leave: null,
      isToday: s.isToday,
      dateLabel: s.dateLabel,
    }));
  }
}

