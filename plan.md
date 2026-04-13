# Vera AI — Execution Plan

## Deliverable 1 — Agent AI Workspace (Implemented)

### Completed Foundation

- Auth + Supabase SSR + route protection are live.
- Dashboard shell, sidebar, chat UI, agents, settings, billing, and admin area are live.
- Chat streaming UX is stable on the current temporary single-route flow.
- Export actions (PDF/Markdown/Text) and AI title generation are live in chat header.
- Test mode and legacy draft/old chat files were removed.

### Important Reality Check

- Current active chat is temporary single-route logic at `/dashboard/chat`.
- Legacy `[id]` chat route implementation has been removed for a clean rebuild.
- Plan now moves to a fresh architecture reset before Deliverable 2.

---

Goal: Rebuild chat logic from scratch with the least code and highest reliability using AI SDK + Supabase, preserving current smooth UX.

### Architecture Decision (Locked)

- Orchestration: AI SDK (`useChat`, `DefaultChatTransport`, `streamText`, `toUIMessageStreamResponse`).
- Persistence + account memory: Supabase.
- Generation provider: Anthropic.
- Session model: explicit session URLs (`/dashboard/chat/[id]`) rebuilt fresh.
- No reuse of old deleted `[id]` implementation bodies.

---

### Phase 0 — Safe Point and Baseline Lock

Status: Completed

Scope:

- Create a safe downgrade document: `docs/chat-workflow-safe-point.md`.
- Freeze known-good behavior before migration starts.

Must include:

- Current architecture summary and constraints.
- Critical files and responsibilities.
- Rollback procedure.
- Smoke test checklist.

Gate to pass:

- Send from welcome -> stream starts cleanly.
- Stop works.
- Retry works.
- Model switch reset works.
- AI title resolves from skeleton.
- Export all three formats and verify file names.

If any fail:

- Fix baseline regression first.
- Re-run Phase 0 checks.

---

### Phase 1 — Fresh Persistent Chat Core

Status: Implemented (pending gate validation)

Scope:

- Reintroduce session-based chat routes from scratch.
- New chat creation -> redirect to `/dashboard/chat/[id]`.
- Use AI SDK chat protocol end-to-end.
- Persist UI messages in Supabase on assistant finish.
- Enforce model lock per session.

Gate to pass:

- New session creates + opens correctly.
- Streaming response works on first turn and subsequent turns.
- Refresh restores history.
- Stop/retry remain stable.
- Model cannot change inside an existing session.

Phase 1 Validation Addendum — Dual Assistant Failsafe (RESOLVED):

- Status: VALIDATED AND CLOSED. Bootstrap duplicate issue is fixed.
- Fix summary:
  - A compare-and-swap (CAS) claim on `chats.updated_at` runs at the TOP of
    `app/api/chat/[id]/route.ts`, before `streamText` is called.
  - The winning request (first to claim) generates and persists normally.
  - The losing request (updated_at no longer matches) returns an empty SSE
    stream in <50ms — 0 tokens spent, no UI error, SDK completes gracefully.
  - This is fully safe with or without React Strict Mode.
  - `reactStrictMode: false` is set in next.config.mjs to reduce dev noise
    but is NOT required for correctness — the server is the authority.
  - Client bootstrap is a simple `useEffect([], [])` on mount — no guards,
    no timers, no module locks needed.
  - `onFinish` retains tail-turn dedupe as a secondary safety net only.
- Strict Mode status: disabled in dev (`reactStrictMode: false`). Re-enabling
  is safe in the future — the server CAS handles duplicates regardless.
- Core logic is stable. Do not modify CAS placement without re-running gates.

Additional gate to pass:

- First load + hard refresh + re-entry must not create dual assistant rows in Supabase.
- DB must preserve full sequence of messages across repeated refresh/re-entry.
- Assistant phrase/stream animation must still appear during active generation after refresh.
- Validation evidence should include one DB sample query for affected chat IDs and one UI recording/GIF.

---

### Phase 2 — Header, Title, Export on Persistent Sessions

Scope:

- Keep current header/export UI.
- Persist generated title to chat record.
- Keep title loading robust (no skeleton lock).

Gate to pass:

- Title survives refresh/navigation.
- Export names use persisted/generated title fallback correctly.
- No title stuck state under Strict Mode.

---

### Phase 3 — Account-wide Memory (Cross-chat Context)

Scope:

- Add compact account memory context in prompt assembly.
- Update memory only after successful turn completion.

Gate to pass:

- New chats use account memory deterministically.
- No cross-user data leakage.
- No noticeable latency regression.

---

### Phase 4 — RAG Foundation

Scope:

- Add retrieval pipeline for documents (and optionally prior chat chunks).
- Keep Anthropic for generation.
- Embedding provider decision made here with explicit approval.

Gate to pass:

- Retrieval improves relevant answers on seeded tests.
- Feature flag can disable RAG cleanly.
- Baseline chat still works with RAG off.

---

### Phase 5 — Hardening and Cleanup

Scope:

- Remove temporary legacy chat logic.
- Add message validation and defensive fallbacks.
- Add monitoring for stream/persist/title failures.

Gate to pass:

- Full regression checklist green.
- Typecheck/lint/build clean.
- UX remains smooth (no transition glitches).

---

## Deliverable 2 — Marketing Website (Starts After 1.5 Green)

### Planned Marketing Pages

- `/` Home
- `/product`
- `/pricing`
- `/services`
- `/contact`
- `/legal/privacy-policy`
- `/legal/terms-of-service`

---

## Working Rule

- We move phase by phase.
- We do not proceed to the next phase until current phase tests are green.
- If a bug appears, phase stays open until fixed and re-tested.

text like this causes chat composer to break:There are 195 countries in the world, comprised of:

193 United Nations member states
2 UN observer states (Vatican City and Palestine)
This count can vary slightly depending on the source and how certain territories or disputed regions are classified, but 195 is the most widely accepted figure.

Is there a specific audit or compliance question I can help you with related to international operations or multi-country regulatory requirements?
