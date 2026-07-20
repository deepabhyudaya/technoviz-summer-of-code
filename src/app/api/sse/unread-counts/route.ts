import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUnreadCounts } from "@/actions/notification.actions";

export async function GET(request: NextRequest) {
  // Derive userId from the authenticated session — never trust query string.
  // Previously this route accepted ?userId=X and would happily stream another
  // user's unread counts to anyone who guessed an ID.
  const { userId } = auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const safeEnqueue = (data: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          closed = true;
        }
      };

      // Initial payload
      try {
        const counts = await getUnreadCounts();
        safeEnqueue(`data: ${JSON.stringify(counts)}\n\n`);
      } catch (error) {
        console.error("Error fetching initial unread counts:", error);
      }

      // Data tick every 30s
      const dataInterval = setInterval(async () => {
        try {
          const counts = await getUnreadCounts();
          safeEnqueue(`data: ${JSON.stringify(counts)}\n\n`);
        } catch (error) {
          console.error("Error fetching unread counts:", error);
        }
      }, 30_000);

      // Heartbeat every 20s — SSE comments (lines beginning with `:`) keep
      // proxies/CDNs from idle-killing the connection without producing data
      // events client-side.
      const heartbeatInterval = setInterval(() => {
        safeEnqueue(`: ping\n\n`);
      }, 20_000);

      request.signal.addEventListener("abort", () => {
        clearInterval(dataInterval);
        clearInterval(heartbeatInterval);
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      // Disable response buffering on common proxies (nginx, Cloudflare).
      "X-Accel-Buffering": "no",
    },
  });
}