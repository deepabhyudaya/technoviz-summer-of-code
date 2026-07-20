// War-server helpers (Phase 2A).
// Centralises every server-side mutation that the war engine needs to perform
// on a battlefield/duel-arena `Server`:
//   - creating war-scoped custom `ServerRole`s (CR, Warrior, Duelist) with sensible defaults
//   - assigning those roles to members
//   - posting and updating a single "scoreboard" `ServerMessage` per rivalry
//   - posting system messages into the lore-archive / hall-of-fame channels
//   - archiving the server at conclude time (rename + freeze flag on the war row)
//
// Every function accepts an optional `tx` Prisma client so it composes cleanly
// inside the `$transaction` blocks added in Phase 1.

import prisma from "./prisma";
import { ROLE_PERMISSIONS } from "./role-permissions";

type Db = typeof prisma | any;

// ============================================================================
// ROLE CREATION
// ============================================================================

export interface WarRoleSeed {
  name: string;
  color?: string | null;
  iconUrl?: string | null;
  position: number; // higher = more powerful (Discord style)
  permissions?: bigint;
  hoist?: boolean;
}

/** Default permission bundle for the auto-created Warrior role. */
const WARRIOR_PERMISSIONS =
  ROLE_PERMISSIONS.VIEW_CHANNELS |
  ROLE_PERMISSIONS.SEND_MESSAGES |
  ROLE_PERMISSIONS.MENTION_EVERYONE;

/** Default permission bundle for the auto-created CR role (warrior + light mod). */
const CR_PERMISSIONS =
  WARRIOR_PERMISSIONS |
  ROLE_PERMISSIONS.MANAGE_MESSAGES |
  ROLE_PERMISSIONS.MUTE_MEMBERS;

/** Creates a single custom ServerRole on the given war server. */
export async function createWarServerRole(
  serverId: string,
  seed: WarRoleSeed,
  db: Db = prisma
): Promise<string> {
  const role = await db.serverRole.create({
    data: {
      serverId,
      name: seed.name,
      color: seed.color ?? null,
      iconUrl: seed.iconUrl ?? null,
      position: seed.position,
      permissions: seed.permissions ?? WARRIOR_PERMISSIONS,
      hoist: seed.hoist ?? true,
      mentionable: true,
    },
  });
  return role.id;
}

/**
 * Create both Warrior roles (one per class) and both CR roles for a branch-war
 * battlefield server. Order is stable so the caller can store the four ids on
 * the `ClassRivalry` row.
 */
export async function createBranchWarRoles(
  serverId: string,
  classA: { name: string },
  classB: { name: string },
  db: Db = prisma
): Promise<{
  crARoleId: string;
  crBRoleId: string;
  warriorARoleId: string;
  warriorBRoleId: string;
}> {
  // Created sequentially so they nest cleanly inside an interactive Prisma tx.
  const crARoleId = await createWarServerRole(serverId, {
    name: `CR · ${classA.name}`,
    color: "#FF6B6B",
    position: 50,
    permissions: CR_PERMISSIONS,
  }, db);
  const crBRoleId = await createWarServerRole(serverId, {
    name: `CR · ${classB.name}`,
    color: "#4DABF7",
    position: 50,
    permissions: CR_PERMISSIONS,
  }, db);
  const warriorARoleId = await createWarServerRole(serverId, {
    name: `Warrior · ${classA.name}`,
    color: "#FA5252",
    position: 30,
    permissions: WARRIOR_PERMISSIONS,
  }, db);
  const warriorBRoleId = await createWarServerRole(serverId, {
    name: `Warrior · ${classB.name}`,
    color: "#339AF0",
    position: 30,
    permissions: WARRIOR_PERMISSIONS,
  }, db);
  return { crARoleId, crBRoleId, warriorARoleId, warriorBRoleId };
}

/** Create the Duelist role for a 1v1 student duel arena. */
export async function createStudentWarRoles(
  serverId: string,
  db: Db = prisma
): Promise<{ warriorRoleId: string }> {
  const warriorRoleId = await createWarServerRole(
    serverId,
    {
      name: "Duelist",
      color: "#9775FA",
      position: 40,
      permissions: WARRIOR_PERMISSIONS,
    },
    db
  );
  return { warriorRoleId };
}

// ============================================================================
// ROLE ASSIGNMENT (engine-side, no auth check — used inside trusted server actions)
// ============================================================================

/**
 * Assigns a role to a server member by userId. Idempotent: if the member
 * already has the role this is a silent no-op and returns false. Returns true
 * when a new assignment was created. Silently skips if the user isn't a
 * server member yet.
 */
export async function assignWarRole(
  serverId: string,
  userId: string,
  roleId: string,
  assignedBy: string | null = null,
  db: Db = prisma
): Promise<boolean> {
  const member = await db.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });
  if (!member) return false;

  try {
    await db.serverMemberRole.create({
      data: { memberId: member.id, roleId, assignedBy },
    });
    return true;
  } catch (err: any) {
    if (err?.code === "P2002") return false; // already has the role
    throw err;
  }
}

/** Bulk-assigns one role to many users; idempotent. */
export async function assignWarRoleToMany(
  serverId: string,
  userIds: string[],
  roleId: string,
  assignedBy: string | null = null,
  db: Db = prisma
): Promise<{ assigned: number; skipped: number }> {
  if (userIds.length === 0) return { assigned: 0, skipped: 0 };

  const members = await db.serverMember.findMany({
    where: { serverId, userId: { in: userIds } },
    select: { id: true, userId: true },
  });

  let assigned = 0;
  for (const m of members) {
    const created = await db.serverMemberRole
      .create({ data: { memberId: m.id, roleId, assignedBy } })
      .then(() => true)
      .catch((err: any) => {
        if (err?.code === "P2002") return false;
        throw err;
      });
    if (created) assigned += 1;
  }
  return { assigned, skipped: userIds.length - assigned };
}

// ============================================================================
// CHANNEL LOOKUP
// ============================================================================

export async function findWarChannelByName(
  serverId: string,
  name: string,
  db: Db = prisma
): Promise<{ id: string } | null> {
  const ch = await db.serverChannel.findFirst({
    where: { serverId, name },
    select: { id: true },
  });
  return ch ?? null;
}

// ============================================================================
// SYSTEM MESSAGE POSTING
// ============================================================================

interface SystemMessageOpts {
  channelId: string;
  content: string;
  senderId?: string;
  senderUsername?: string;
  senderRole?: string;
  db?: Db;
}

/**
 * Posts a system-authored message into a war channel. Uses sentinel sender
 * fields (no FK on `ServerMessage.senderId`) so we don't pollute the audit
 * trail with a real user id.
 */
export async function postWarSystemMessage(opts: SystemMessageOpts) {
  const db: Db = opts.db ?? prisma;
  return db.serverMessage.create({
    data: {
      content: opts.content,
      channelId: opts.channelId,
      senderId: opts.senderId ?? "system",
      senderUsername: opts.senderUsername ?? "Arena",
      senderRole: opts.senderRole ?? "system",
      messageType: "TEXT",
    },
  });
}

// ============================================================================
// SCOREBOARD (single canonical message per rivalry, edited on every score change)
// ============================================================================

export interface BranchScoreboard {
  classAName: string;
  classBName: string;
  classAScore: number;
  classBScore: number;
  totalBouts: number;
  status: string;
  winnerName?: string | null;
}

export function renderBranchScoreboard(s: BranchScoreboard): string {
  const lines: string[] = [];
  lines.push(`📊 **LIVE SCOREBOARD**`);
  lines.push(``);
  lines.push(`🔴 **${s.classAName}** — ${s.classAScore.toFixed(0)} pts`);
  lines.push(`🔵 **${s.classBName}** — ${s.classBScore.toFixed(0)} pts`);
  lines.push(``);
  lines.push(`Bouts fought: **${s.totalBouts}**`);
  lines.push(`Status: \`${s.status}\``);
  if (s.winnerName) lines.push(`🏆 Winner: **${s.winnerName}**`);
  lines.push(``);
  lines.push(`_Auto-updates after every bout. Pinned by the Arena._`);
  return lines.join("\n");
}

export interface StudentScoreboard {
  studentAName: string;
  studentBName: string;
  studentAScore: number;
  studentBScore: number;
  totalBouts: number;
  status: string;
  winnerName?: string | null;
}

export function renderStudentScoreboard(s: StudentScoreboard): string {
  const lines: string[] = [];
  lines.push(`⚔️ **DUEL SCOREBOARD**`);
  lines.push(``);
  lines.push(`🟣 **${s.studentAName}** — ${s.studentAScore.toFixed(0)} pts`);
  lines.push(`🟢 **${s.studentBName}** — ${s.studentBScore.toFixed(0)} pts`);
  lines.push(``);
  lines.push(`Rounds fought: **${s.totalBouts}**`);
  lines.push(`Status: \`${s.status}\``);
  if (s.winnerName) lines.push(`🏆 Winner: **${s.winnerName}**`);
  lines.push(``);
  lines.push(`_Auto-updates after every round. Pinned by the Arena._`);
  return lines.join("\n");
}

/**
 * Create-or-edit the canonical scoreboard message for a rivalry. Returns the
 * message id (caller should persist it on the rivalry row on first creation).
 */
export async function upsertScoreboardMessage(
  channelId: string,
  content: string,
  existingMessageId: string | null | undefined,
  db: Db = prisma
): Promise<string> {
  if (existingMessageId) {
    const existing = await db.serverMessage.findUnique({
      where: { id: existingMessageId },
      select: { id: true },
    });
    if (existing) {
      await db.serverMessage.update({
        where: { id: existingMessageId },
        data: { content },
      });
      return existingMessageId;
    }
    // The persisted id no longer points to a live message (channel was wiped,
    // message was hard-deleted, etc.) — fall through and create a new one.
  }
  const created = await db.serverMessage.create({
    data: {
      content,
      channelId,
      senderId: "system",
      senderUsername: "Arena",
      senderRole: "system",
      messageType: "TEXT",
    },
  });
  return created.id;
}

// ============================================================================
// ARCHIVE (renames the server and writes a final summary post)
// ============================================================================

export async function archiveWarServer(
  serverId: string | null,
  opts: {
    finalName?: string;
    archiveChannelId?: string | null;
    summaryContent?: string;
    db?: Db;
  } = {}
): Promise<void> {
  if (!serverId) return;
  const db: Db = opts.db ?? prisma;

  if (opts.finalName) {
    await db.server.update({
      where: { id: serverId },
      data: { name: opts.finalName, isDiscoverable: false },
    });
  }

  if (opts.archiveChannelId && opts.summaryContent) {
    await postWarSystemMessage({
      channelId: opts.archiveChannelId,
      content: opts.summaryContent,
      senderUsername: "Arena · Hall of Fame",
      db,
    });
  }
}
