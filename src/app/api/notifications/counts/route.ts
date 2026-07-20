import { NextResponse } from "next/server";
import { getUnreadCounts } from "@/actions/notification.actions";

/**
 * GET /api/notifications/counts
 * Returns the current user's unread notification counts as JSON.
 * Fallback for /api/sse/unread-counts when SSE is unavailable.
 * Short browser cache eliminates DB churn from rapid client-side polls.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const counts = await getUnreadCounts();
    return NextResponse.json(counts, {
      headers: {
        // private: per-user. max-age=5 absorbs duplicate polls within the
        // same 5-second window without staleness becoming user-visible.
        "Cache-Control": "private, max-age=5, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch notification counts" },
      { status: 500 }
    );
  }
}
