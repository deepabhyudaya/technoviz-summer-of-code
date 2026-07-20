// Real-time war event publisher (Phase 2A).
// Layered on top of the existing Ably integration in `ably-server.ts` so the
// war UI can subscribe to a single channel per rivalry and react to score
// updates, new bouts, strikes, lore drops, and conclusions without polling.
//
// All publishes are best-effort: a missing ABLY_API_KEY makes them silent
// no-ops so dev environments without Ably credentials still work.

import { ablyPublish } from "./ably-server";

export function getBranchWarChannel(rivalryId: string): string {
  return `war:branch:${rivalryId}`;
}

export function getStudentWarChannel(rivalryId: string): string {
  return `war:student:${rivalryId}`;
}

export type WarEvent =
  | {
      type: "war:score";
      rivalryId: string;
      classAScore?: number;
      classBScore?: number;
      studentAScore?: number;
      studentBScore?: number;
    }
  | {
      type: "war:bout";
      rivalryId: string;
      boutId: string;
      round: number;
      title: string;
      classAPoints?: number;
      classBPoints?: number;
      studentAPoints?: number;
      studentBPoints?: number;
      winnerId?: string | number | null;
      mvpStudentId?: string | null;
    }
  | {
      type: "war:lore";
      rivalryId: string;
      weekNumber: number;
      title: string;
    }
  | {
      type: "war:strike";
      rivalryId: string;
      studentId: string;
      reason: string;
      mutedUntil?: string | null;
    }
  | {
      type: "war:concluded";
      rivalryId: string;
      winnerId: string | number | null;
      isSurrender?: boolean;
    }
  | {
      type: "war:archived";
      rivalryId: string;
      battlefieldServerId: string | null;
    };

/**
 * Publishes a war event to the appropriate Ably channel. Returns true on
 * success, false on missing credentials or transport failure (logged inside
 * ablyPublish). Callers should not branch on the return value — these are
 * UI-enhancement events, not source-of-truth.
 */
export async function publishWarEvent(
  scope: "branch" | "student",
  event: Extract<WarEvent, { rivalryId: string }>
): Promise<boolean> {
  const channel =
    scope === "branch"
      ? getBranchWarChannel(event.rivalryId)
      : getStudentWarChannel(event.rivalryId);
  // ablyPublish only narrowly types its second arg; cast at the boundary.
  return ablyPublish(channel, event as any);
}
