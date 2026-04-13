# Chat Bootstrap + Persistence Bug Handoff Report

## Scope

This report documents the recurring chat issue where assistant output differs before vs after refresh without a new user prompt, plus all attempted fixes and their outcomes.

Goal for next model: stabilize first-turn bootstrap behavior so exactly one assistant generation request happens when needed, persistence is reliable, and refresh never shows a different answer for the same turn.

---

## Primary Symptom

User flow:

1. Open chat that has first user message and no assistant persisted yet (or appears that way in current session state).
2. Observe assistant response in UI.
3. Refresh page.
4. Same user prompt now shows a different assistant response (no new prompt sent by user).

Meaning:

- At least two assistant generations are happening for the same logical turn, or
- The response shown pre-refresh is not the one persisted to DB, and refresh rehydrates a different one.

---

## Network Evidence Collected

From user payloads/screenshots:

- Two POST requests to `/api/chat/[id]` were observed for one logical submit.
- Both had `trigger: "submit-message"`.
- Both had the same `messageId` for the user turn.
- Request `id` differed between calls (client-generated request id differed).

This strongly indicates client-side duplicate bootstrap dispatch under mount/effect lifecycle, not user double input.

Later screenshots showed temporary states with one request, but dead-state behavior still occurred in some cycles, suggesting guard logic changed dispatch timing but not root stability.

---

## Current Relevant Files

- `app/(dashboard)/dashboard/chat/components/chat-session.tsx`
  - Bootstrap logic that auto-calls `sendMessage()` when the thread has user-only tail state.
  - Multiple guard strategies were attempted here.

- `app/api/chat/[id]/route.ts`
  - Streaming endpoint.
  - `onFinish` persists messages.
  - Contains atomic commit claim + append-only dedupe logic.

- `app/api/chat/title/route.ts`
  - Title generation endpoint.
  - Writes `title` to chats table when placeholder title.

- `app/(dashboard)/dashboard/chat/components/chat-header.tsx`
  - Title generation invocation + shared state sync to sidebar.

- `app/(dashboard)/dashboard/chat/[id]/page.tsx`
  - Rehydrates chat from DB and passes initial messages/title.

---

## Attempted Fixes (Chronological)

### 1) Prompt-only title mode (temporary)

- Disabled title API calls and used prompt text as title.
- Helped isolate title side effects, but did not permanently solve bootstrap duplication.

### 2) Re-enabled title API with shared store sync

- Header + sidebar sync restored through shared Zustand state.
- Added guard to avoid regeneration when DB already has non-placeholder title.

### 3) Atomic commit claim in chat stream route

- In `onFinish`, update `chats.updated_at` with condition `.eq("updated_at", chat.updated_at)`.
- If claim fails, skip persistence.
- Intended to prevent concurrent duplicate persistence.

### 4) Append-only dedupe persistence (no delete/rewrite)

- Removed destructive delete+rewrite approach.
- Dedupe logic moved toward tail-turn checks.
- Improved history stability but did not fully eliminate pre-refresh mismatch.

### 5) Title route update collision fix

- Removed `updated_at` writes from `app/api/chat/title/route.ts` to avoid racing the commit claim.
- Kept title write only.

### 6) Multiple client bootstrap guard approaches

Tried variants in `chat-session.tsx`:

- Window-scoped in-flight lock.
- Module-scoped chat-level lock.
- Module-scoped per-turn lock + retry window.
- Instance-local deferred timer + message-id lock.

Observed issues across attempts:

- Some removed duplicate dispatch but introduced dead bootstrap states.
- Some removed dead states but duplicate dispatch returned under certain remount/re-render timing.

---

## Current State (At Handoff)

User still reports and demonstrates:

- Pre-refresh can still show two `/api/chat/[id]` requests in some runs.
- In other runs, one request appears but dead-state behavior can still happen.
- Response mismatch before vs after refresh continues intermittently.

Therefore, issue remains unresolved and non-deterministic with current guard strategy.

---

## Likely Root Cause Cluster

### A) Client bootstrap dispatch under React lifecycle

The first-turn bootstrap is effect-driven and sensitive to remount/re-render/transition timing (Strict Mode dev and animated route transitions can expose this).

### B) Split between visible stream and persisted stream

If multiple requests occur, user may see stream A while DB persists stream B. Refresh then rehydrates B, appearing as spontaneous answer mutation.

### C) Guard placement mismatch

Global/module locks can survive where they should not; instance locks can reset where they should not. A robust key and lifecycle boundary is not yet nailed.

---

## Strong Candidates for Next Fix Design

1. Move bootstrap trigger out of generic effect into a stricter transition point

- Prefer event-driven trigger where possible.
- If effect is required, gate with deterministic server-issued turn token.

2. Introduce explicit bootstrap idempotency key persisted server-side

- Example concept: `chat_id + last_user_message_id` tracked in a dedicated field/table for bootstrap dispatch claims.
- Server should accept first claim only; later claims for same key should no-op.

3. Keep persistence write authoritative to one final assistant per turn key

- Server should reject/ignore assistant persistence for already-claimed turn key.
- Do not rely only on content-based dedupe.

4. Add temporary debug telemetry

- Log request id, chat id, message id, trigger, commit-claim result, and persistence decision.
- Remove after Phase 1 signoff.

---

## Existing Core Notes in Code

There are existing “PHASE 1 CORE (validated)” comments in:

- `app/(dashboard)/dashboard/chat/components/chat-session.tsx`
- `app/api/chat/[id]/route.ts`

These reflect intent and previous validation assumptions, but current user evidence indicates behavior is still not fully reliable.

---

## Minimal Verification Checklist for Next Model

1. Reproduce with Network filter: `/api/chat/` and Fetch/XHR only.
2. Confirm whether duplicate `submit-message` requests occur for same `messageId`.
3. Capture DB rows for one affected chat after each run:

```sql
select role, content, created_at
from public.messages
where chat_id = '<CHAT_ID>'
order by created_at asc;
```

4. Compare:

- Assistant text visible pre-refresh
- Assistant text persisted in DB
- Assistant text rehydrated post-refresh

Success criteria:

- Exactly one bootstrap request for first unresolved turn.
- Exactly one persisted assistant for that turn.
- Pre-refresh and post-refresh assistant text identical.

---

## Constraint from User

User requested no further runtime logic changes in this step and asked for a complete handoff report for another model. This file is intended to be that handoff artifact.
