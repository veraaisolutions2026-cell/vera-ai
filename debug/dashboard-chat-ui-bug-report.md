# Dashboard Chat UI Bug Report

## Date

April 13, 2026

## Owner

Handoff for senior engineering review

## Scope

This report covers the real dashboard chat experience under app routes in the dashboard group, not the removed test route.

## Executive Summary

The backend stream path is functioning, but the dashboard UI still intermittently shows stale or dropped response states.

Primary user-facing failures:

- Assistant response does not appear even when network request succeeds.
- Dead-state fallback appears despite successful streaming requests.
- Follow-up prompts can fail to render assistant output.
- User can experience apparent empty responses after request completion.

This is currently a UI state/rendering reliability issue with significant user trust impact.

## Severity

High

Reason:

- Core chat reliability is degraded from user perspective.
- Backend success is not reflected in UI consistently.
- Failures occur in normal multi-turn usage.

## Affected Area

- Dashboard chat session UX and state transitions
- Welcome-to-chat handoff path
- Streaming message rendering path

Relevant files:

- [app/(dashboard)/dashboard/chat/components/chat-session.tsx](<app/(dashboard)/dashboard/chat/components/chat-session.tsx>)
- [app/(dashboard)/dashboard/chat/components/chat-message.tsx](<app/(dashboard)/dashboard/chat/components/chat-message.tsx>)
- [app/(dashboard)/dashboard/chat/[id]/page.tsx](<app/(dashboard)/dashboard/chat/%5Bid%5D/page.tsx>)
- [app/api/chat/[id]/route.ts](app/api/chat/%5Bid%5D/route.ts)
- [lib/db/messages.ts](lib/db/messages.ts)

## Reproduction (Real Dashboard)

1. Open dashboard chat at /dashboard/chat.
2. Start a new conversation and send prompt 1.
3. Wait for stream completion.
4. Send prompt 2.
5. Observe intermittent UI failure modes.

Observed failure modes:

- Assistant output missing while request succeeded.
- Dead-state fallback shown even when backend returned 200.
- Subsequent turn appears stalled or empty.

## Evidence Summary

From logs and observed behavior during debugging:

- POST requests to chat endpoint return 200 while UI still shows drop/empty state.
- In some failure cases, multiple chat requests are issued for one perceived user attempt.
- Stream-level/backend path can complete while rendered assistant content does not become visible.

## Known Good vs Known Broken

Known good:

- Backend request path can produce successful responses.
- History retention path was previously corrected for authenticated refresh flow.

Known broken:

- UI rendering/state consistency after stream completion is still unstable.
- Multi-turn reliability remains inconsistent.

## Fixes Already Attempted

1. History retention fix in loader path

- Pair read path adjusted so refresh history loads correctly under auth constraints.
- Result: refresh retention improved.

2. First-turn reveal mitigation

- Added reveal behavior for fast-complete streams.
- Result: first-turn display improved in some scenarios.

3. Welcome-to-chat composer handoff refactor

- Shifted toward single-composer behavior and smoother layout transition.
- Result: UX transition improved, but stale/drop issues still observed.

4. Duplicate key warning fix

- Added explicit keys to animated sibling layers.
- Result: duplicate key console error resolved.

5. Temporary test route experiment

- Isolated non-DB path was attempted and later removed per request.
- Current focus is production dashboard behavior only.

## Current Hypotheses

1. Stream status and visible content are out of sync

- UI may mark stream complete before assistant text part is rendered.

2. Message part extraction/rendering mismatch

- Assistant message may contain parts not mapped into visible text path reliably in all states.

3. Dead-state watchdog races with late assistant chunks

- Fallback state may trigger before final assistant content lands in render tree.

4. Duplicate in-flight request state

- Retries/regenerations or repeated submit paths may cause conflicting state transitions.

5. Layering/visibility edge case during transition

- Rendered content may exist in state but be hidden/occluded by transition layers in some timing windows.

## Recommended Senior Investigation Plan

1. Add per-turn correlation IDs

- Propagate requestId and messageId from API response headers into client logs.
- Correlate send action, status transitions, chunk arrival, and final render.

2. Instrument useChat lifecycle

- Log status transition timeline submitted -> streaming -> ready per turn.
- Log message parts shape for last assistant message at each transition.

3. Enforce single in-flight send policy

- Guard send/retry/regenerate so only one active turn can mutate state at a time.

4. Audit dead-state trigger conditions

- Require explicit no-assistant-content condition with timed grace window before fallback.

5. Add UI visibility assertions

- On every successful turn completion, assert there is a visible assistant text payload.

6. Verify welcome/chat transition isolation

- Ensure transition layers cannot suppress chat message visibility after first user turn.

## Acceptance Criteria

- For 30 consecutive manual turns in dashboard chat:
  - No empty assistant render when request returns 200.
  - No false dead-state fallback on successful stream.
  - No duplicate request dispatch for one submit action.
  - Prompt 2+ reliability matches prompt 1 behavior.

## Notes

- Test route and test API created during debugging were removed intentionally.
- This report is scoped to production dashboard chat behavior only.
