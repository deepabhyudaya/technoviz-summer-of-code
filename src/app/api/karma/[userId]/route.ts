import { NextRequest, NextResponse } from "next/server";
import { getUserKarmaBreakdown } from "@/actions/karma-tracking.actions";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const breakdown = await getUserKarmaBreakdown(userId);
    
    // private: response is per-user — must not be served to other users from
    // any shared cache. 5s max-age gives a UI-feel "instant on revisit" while
    // SWR=60 keeps the spinner away on staleness windows.
    return NextResponse.json(
      { breakdown },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("[Karma API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch karma breakdown" },
      { status: 500 }
    );
  }
}
