import { NextRequest, NextResponse } from "next/server";
import { finalizeSeason } from "@/actions/season-conclude.actions";
import prisma from "@/lib/prisma";

// Cron-safe route to auto-finalize seasons that have passed their 48h wind-down.
// Expected to be called by a Vercel Cron or external scheduler.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const concluding = await prisma.season.findMany({
    where: { status: "CONCLUDING", concludingStartedAt: { not: null } },
  });

  const finalized: string[] = [];
  const skipped: string[] = [];

  for (const season of concluding) {
    if (!season.concludingStartedAt) continue;
    const elapsedHours =
      (now.getTime() - season.concludingStartedAt.getTime()) / 3600_000;
    if (elapsedHours >= 48) {
      try {
        await finalizeSeason(season.id);
        finalized.push(season.id);
      } catch (err: any) {
        skipped.push(`${season.id}: ${err?.message}`);
      }
    }
  }

  return NextResponse.json({ finalized, skipped, count: finalized.length });
}
