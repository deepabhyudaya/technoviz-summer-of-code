import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Called client-side after sign-in to ensure the Clerk user
 * exists in the local DB Admin table. Safe to call multiple times.
 */
export async function POST() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const role = (user?.publicMetadata as { role?: string })?.role;

  if (role !== "admin") {
    return NextResponse.json({ error: "Not an admin" }, { status: 403 });
  }

  // Upsert so it's idempotent
  await prisma.admin.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      username: user?.username ?? userId,
    },
  });

  return NextResponse.json({ ok: true });
}
