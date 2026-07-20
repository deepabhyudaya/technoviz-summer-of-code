# War System Bug Audit (Section B)

This is the master bug report from the Phase 1 audit of the Branch War (`ClassRivalry`) and Student War (`StudentRivalry`) subsystems. Bugs that are *missing features* per the prompt (ally system, spectator betting, socket.io war rooms, warrior roles on server members, scoreboard pinned post, lore auto-posting to channel, war-crimes engine, archive flow) are marked **MISSING-FEATURE** and will be implemented in Phase 2.

Legend:
- **P1** Critical (breaks the feature / data loss / FK risk)
- **P2** High (broken UX, wrong data, non-atomic state)
- **P3** Medium (degraded experience)
- **P4** Low (polish)
- **MF** Missing feature (built in Phase 2)

---

## Branch War (`ClassRivalry`)

### BW-001 — Bout race / no transaction on CR-approval activation
- **Location**: `src/actions/rivalry.actions.ts` → `crApproveRivalry` (≈ lines 284–361)
- **Priority**: P2
- **Description**: `crApproveRivalry` issues up to *three* separate Prisma writes (`update` for stored-CR sync, `createBattlefieldServer` which creates Server + categories + channels + members, then a final `update` to set `ACTIVE` + `battlefieldServerId`). If any write after the first fails, the rivalry is left in an inconsistent state (e.g. server exists but rivalry stays in `PENDING_CR`, or one CR appears approved but server never created).
- **Root cause**: Multi-step state transition not wrapped in `prisma.$transaction`.
- **Fix**: Compute final `updateData` once, then run `[serverCreate, rivalryUpdate]` inside `prisma.$transaction`. Notifications fire after commit.
- **Test**: Manually trigger CR approval; kill DB mid-call; reload page → rivalry status must remain `PENDING_CR` and no orphan Server exists.
- **Side effects**: `createBattlefieldServer` must accept a `tx` client.

### BW-002 — `drawRivalryParticipants` is unauthenticated and non-atomic
- **Location**: `src/actions/rivalry.actions.ts:731`
- **Priority**: P2
- **Description**: Exported `"use server"` action with no `requireRole` / no `getCallerStudent` guard — any authenticated user can call it and force-roster other students. Also reads `rivalryMember` then `createMany` separately → two admins drawing simultaneously can over-fill.
- **Root cause**: Missing auth guard + no transaction.
- **Fix**: Require `admin` or `teacher` role; wrap eligibility read + `createMany` inside `$transaction`.
- **Test**: Call from a student session → expect `Unauthorized`. Two parallel admin calls must not exceed `count` per side.

### BW-003 — `expireStaleRivalries` updates sequentially, no transaction
- **Location**: `src/actions/rivalry.actions.ts:700`
- **Priority**: P3
- **Description**: For-loop updates without transaction; if one fails the cron is left partially run; notifications can also double-fire on retry.
- **Fix**: Wrap each rivalry expiry in its own `$transaction`; add idempotency guard (`status: "PENDING_ADMIN"` recheck inside tx).

### BW-004 — Winner bonus loop in `concludeRivalry` is not atomic and not idempotent
- **Location**: `src/actions/rivalry.actions.ts:616` → `concludeRivalry`
- **Priority**: P3
- **Description**: Awards +200 `pointsContributed` to every winning student in a sequential `for` loop. If the function is called twice (admin double-clicks) winners get +400. Also runs outside a transaction with the `update` that sets `CONCLUDED`.
- **Fix**: Guard with `status === "ACTIVE"` inside a `$transaction`; collapse loop into a single `updateMany` with `where: { rivalryId, classId: winnerClassId }`.

### BW-005 — `recordBout` never updates `RivalryMember.pointsContributed`
- **Location**: `src/actions/rivalry.actions.ts:450`
- **Priority**: P3
- **Description**: Bout points are added only to `classAScore`/`classBScore` on the rivalry — no per-warrior attribution. As a result `convertRivalryPoints` (which reads `rivalryMember.pointsContributed`) returns "Insufficient Rivalry Points" for active rivalries.
- **Status**: Documented; per-warrior attribution will be added in Phase 2 (along with MVP detection + warrior roles).

### BW-006 — `createBattlefieldServer` uses `createdById: "system"`
- **Location**: `src/actions/rivalry.actions.ts:381`
- **Priority**: P4
- **Description**: Cosmetic — `Server.createdById` is a plain `String` (no FK), so no FK violation, but `"system"` is non-resolvable when the UI tries to show "Created by …".
- **Fix**: Pass approving-admin's `userId` instead.

### BW-007 — Warrior role / scoreboard pin / lore channel posting / war-crimes engine / archive on conclude
- **Priority**: MF — Phase 2.

### BW-008 — Socket.io war rooms
- **Priority**: MF — Phase 2.

### BW-009 — Battle mechanics per war type for branch wars
- **Description**: `WarType` only attaches to `StudentRivalryBout`, not to `RivalryBout`. Branch wars only support generic admin-recorded bouts.
- **Priority**: MF — Phase 2 (will add `warTypeId`, `status`, `teacherId` etc. to `RivalryBout`).

---

## Student War (`StudentRivalry`)

### SW-001 — Bout created before admin approval / target acceptance
- **Location**: `src/actions/student-rivalry.actions.ts:101-113` (`proposeStudentRivalry`)
- **Priority**: P1
- **Description**: When a student proposes a duel, the first `StudentRivalryBout` (round 1) is created immediately in `PENDING` even though the rivalry is in `PENDING_ADMIN`. If admin rejects or proposer retracts, the bout is orphaned (`rivalry.status = "REJECTED"` but `bout.status = "PENDING"`); the `student-rivalry.cron.ts` job will then auto-score bouts attached to rejected rivalries.
- **Root cause**: Bout creation happens at proposal time instead of at acceptance.
- **Fix**: Persist the chosen `warTypeId` + `teacherId` on the `StudentRivalry` row (new `pendingWarTypeId`, `pendingTeacherId` columns added by Phase 1 schema) OR carry them through to `targetAcceptStudentRivalry` and create the bout there. Phase 1 implementation: store on `StudentRivalry` and only create the bout on `targetAccept`.
- **Test**: Propose → admin rejects → ensure no `StudentRivalryBout` rows exist for that rivalry.

### SW-002 — `targetAcceptStudentRivalry` is not atomic
- **Location**: `src/actions/student-rivalry.actions.ts:199`
- **Priority**: P2
- **Description**: `createDuelServer` then `prisma.studentRivalry.update`. Failure between leaves orphan Server.
- **Fix**: Wrap in `$transaction`.

### SW-003 — Cron uses `Math.random()` to score Karma Sprint / Silent War / Reputation War
- **Location**: `src/actions/student-rivalry.cron.ts:42, 65, 76`
- **Priority**: P2
- **Description**: Random numbers are written into the DB as final scores. Karma Sprint should query karma deltas; Silent War should query message counts; Reputation War should query helpful-marks from neutrals. The cron also mutates the rivalry totals without any transaction.
- **Fix**: Phase 2 — replace each scorer with the real data source and wrap the bout-finalisation + rivalry update in a transaction. Phase 1 hardens the structure: only the per-bout update path is changed (transaction wrap); the random scoring is documented and left for Phase 2's real scoring engine.

### SW-004 — `concludeStudentRivalry` mutates `karmaPoints` directly
- **Location**: `src/actions/student-rivalry.actions.ts:443-451`
- **Priority**: P3
- **Description**: Adds 5000 karma straight to `UserCommunityProfile.karmaPoints`, bypassing the karma-category engine (no audit, no badge re-eval). Also adds the winner bonus outside any transaction.
- **Fix**: Phase 2 — route through karma engine; Phase 1 wraps the conclude path in `$transaction` and adds idempotency guard (already concluded → no-op).

### SW-005 — `surrenderStudentRivalry` skips lore + notifications
- **Location**: `src/actions/student-rivalry.actions.ts:254`
- **Priority**: P2
- **Description**: Surrender immediately concludes the rivalry but doesn't generate the closing lore, doesn't fire `STUDENT_WAR_CONCLUDED` notifications, and doesn't run any conclude side-effects (GECX award, badge). Inconsistent with admin-triggered conclude.
- **Fix**: Call into the same conclude pipeline (`concludeStudentRivalry` extracted into an internal `_concludeStudentRivalryInternal(tx, rivalryId, opts)` so both paths share lore + GECX + notification logic).

### SW-006 — `retractStudentRivalryProposal` doesn't notify target or admins
- **Location**: `src/actions/student-rivalry.actions.ts:236`
- **Priority**: P3
- **Description**: Silent state flip to `REJECTED`. The challenged student keeps seeing "you've been challenged" notification.
- **Fix**: Fire `STUDENT_WAR_RETRACTED` notification (new enum value) to target + admins.

### SW-007 — `createDuelServer` uses `createdById: "system"`
- **Location**: `src/actions/student-rivalry.actions.ts:301`
- **Priority**: P4
- **Description**: Same as BW-006.
- **Fix**: Use admin reviewer id (resolved from `rivalry.adminId`); fallback to `"system"` for the very rare case where it's null.

### SW-008 — Existing rivalry check ignores `EXPIRED`
- **Location**: `src/actions/student-rivalry.actions.ts:56-65`
- **Priority**: P4
- **Description**: Doesn't include `EXPIRED` in the existing-rivalry block list; not actually a bug (expired *should* allow re-proposal), documented only.

### SW-009 — Ally system / spectator betting / socket.io rooms / scoreboard pin / lore channel posting / archive on conclude
- **Priority**: MF — Phase 2.

---

## Cross-cutting

### XW-001 — State machine guards missing in some paths
- Bouts can be recorded against rivalries that are not `ACTIVE` via cron path (the cron filters by `status: { in: ["PENDING", "ACTIVE"] }` on the *bout*, not on the rivalry). Phase 1 adds a rivalry-status re-check inside the cron's per-bout transaction.

### XW-002 — Notifications fire inside DB updates
- All actions create notifications inline with DB writes. Acceptable for now; flagged for future move to a queue.

### XW-003 — Real-time / socket.io
- No socket events for any war activity yet. Built in Phase 2 (`war:score`, `war:bout`, `war:lore`, `war:concluded`, `war:strike`).

---

## Phase 1 fixes applied in this commit

Code changes for: **BW-001, BW-002, BW-003, BW-004, BW-006, SW-001, SW-002, SW-004, SW-005, SW-006, SW-007**.

Schema changes for: full season system, honor-badge system, and additive war fields (`seasonId`, `seasonPointsDistributed`, `pendingWarTypeId`, `pendingTeacherId`).

Pending → Phase 2: BW-005, BW-007, BW-008, BW-009, SW-003, SW-009, XW-001, XW-003.
