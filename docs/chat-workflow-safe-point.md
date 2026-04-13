# Deliverable 1.5 — Phase 0 Safe Point

## Purpose

This document is the rollback/safe-downgrade anchor before starting the chat architecture rebuild in Deliverable 1.5.

Use it to:

- restore current working behavior quickly,
- verify baseline UX before migration,
- prevent regressions from carrying into Phase 1.

---

## Current Baseline (Locked)

### Active Chat Mode

- Single active chat route: `/dashboard/chat`
- Current chat behavior is temporary but stable: smooth streaming, stop/retry, model switch reset, animated transitions.
- Legacy `[id]` chat implementation and draft files have been removed.

### Current Stack Decisions

- Generation provider: Anthropic
- UI shell and interactions: Next.js App Router + Motion
- Title generation: async call to `/api/chat/title` with loading skeleton and animated reveal
- Export formats: PDF, Markdown, Text in chat header

### Critical Files (Baseline)

- `app/(dashboard)/dashboard/chat/page.tsx`
- `app/(dashboard)/dashboard/chat/components/chat-composer.tsx`
- `app/(dashboard)/dashboard/chat/components/chat-message.tsx`
- `app/(dashboard)/dashboard/chat/components/chat-header.tsx`
- `app/api/chat/route.ts`
- `app/api/chat/title/route.ts`
- `app/(dashboard)/components/sidebar.tsx`

---

## Do-Not-Change Constraints (Before Phase 1)

- Do not modify streaming UX behavior in temporary baseline.
- Do not reintroduce legacy `[id]` route code from removed files.
- Do not change model-switch reset behavior in baseline.
- Do not remove stop/retry/export/title functionality while entering Phase 1.

---

## Rollback Procedure

If migration work causes instability, rollback to this safe point.

### 1. Inspect current changes

```bash
git status
```

### 2. Save in-progress work (recommended)

```bash
git add -A
git commit -m "WIP: before phase rollback"
```

### 3. Restore baseline commit

Use either:

- `git switch <baseline-branch>` if baseline is on a branch, or
- `git checkout <baseline-commit-sha>` to verify baseline snapshot.

### 4. Re-run baseline smoke tests

Use checklist below. Do not resume migration until all checks pass.

---

## Baseline Smoke Test Checklist (Must Pass)

### A. First-message flow

1. Open `/dashboard/chat`
2. Send first message from welcome state
3. Verify stream appears smoothly and no visual glitch on welcome -> chat transition

Expected:

- First response streams live and smoothly
- Header stays stable

### B. Stop behavior

1. Send a longer prompt
2. Click stop while streaming

Expected:

- Stream aborts immediately
- UI returns to ready state

### C. Retry behavior

1. After an assistant response completes, click Retry

Expected:

- Last user intent is retried
- New assistant response streams correctly

### D. Model-switch reset lock

1. Start a chat and send at least one message
2. Change model from selector

Expected:

- Existing session resets to welcome state
- New model is selected
- No mixed-model continuation in same chat

### E. Title generation robustness

1. Send first prompt
2. Observe title area in header

Expected:

- Skeleton appears briefly
- AI-generated title resolves
- No stuck skeleton state

### F. Export behavior

1. Export as Markdown
2. Export as Text
3. Export as PDF

Expected:

- Downloads trigger correctly
- Filenames are valid and based on title fallback logic

---

## Phase 0 Exit Criteria

Phase 0 is complete only when:

- this safe-point file exists,
- all smoke tests above pass,
- no new errors in key chat files.

---

## Phase 1 Start Condition

Proceed to Phase 1 only after Phase 0 exit criteria are green.
