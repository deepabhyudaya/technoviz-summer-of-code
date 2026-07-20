import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getBadgesForUser } from '@/lib/badge-engine';

export async function GET(req: Request, { params }: { params: { username: string } }) {
  try {
    const student = await prisma.student.findUnique({ where: { username: params.username } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const badges = await getBadgesForUser(student.id, true);
    return NextResponse.json({ badges, student: { id: student.id, username: student.username, name: student.name } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch user badges' }, { status: 500 });
  }
}
