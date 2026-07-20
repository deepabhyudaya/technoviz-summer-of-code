import { NextRequest, NextResponse } from "next/server";
import { getSeasonLeaderboard } from "@/actions/season.actions";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const seasonId = searchParams.get("seasonId");
    const type = searchParams.get("type") as "branch" | "student" | null;
    const limit = Number(searchParams.get("limit") ?? "50");

    if (!seasonId || !type) {
      return NextResponse.json(
        { error: "seasonId and type are required" },
        { status: 400 }
      );
    }

    const data = await getSeasonLeaderboard(seasonId, type, limit);
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
