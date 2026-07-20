import { NextRequest, NextResponse } from "next/server";
import { updateSeasonPointConfig } from "@/actions/season-points.actions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { seasonId, ...config } = body;
    if (!seasonId) {
      return NextResponse.json({ error: "seasonId required" }, { status: 400 });
    }
    await updateSeasonPointConfig(seasonId, config);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update point config" },
      { status: 500 }
    );
  }
}
