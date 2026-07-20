import { NextResponse } from 'next/server';
import { getBadgesForUser } from '@/lib/badge-engine';

export async function GET(req: Request, { params }: { params: { userId: string } }) {
  try {
    const badges = await getBadgesForUser(params.userId);
    return NextResponse.json({ badges });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch badges' }, { status: 500 });
  }
}
