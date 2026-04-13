# AI SDK Streaming/Stale-State Findings Report

Date: 2026-04-13
Scope: Vera AI codebase plus local AI SDK docs in node_modules

## Objective

Document root causes and fixes for stale/delayed/duplicated AI streaming behavior before implementation.

## Docs Coverage

Reviewed from local package docs:

- Troubleshooting index plus all key streaming/useChat/tool/abort pages in `node_modules/ai/docs/09-troubleshooting/*`.
- AI SDK UI behavior docs in `node_modules/ai/docs/04-ai-sdk-ui/*` including chatbot lifecycle, transport, stream protocol, tool usage, persistence, resumption, and error handling.

High-signal docs used for final recommendations:

- `06-streaming-not-working-when-deployed.mdx`
- `06-streaming-not-working-when-proxied.mdx`
- `13-repeated-assistant-messages.mdx`
- `16-streaming-status-delay.mdx`
- `17-use-chat-stale-body-data.mdx`
- `11-use-chat-custom-request-options.mdx`
- `08-use-chat-failed-to-parse-stream.mdx`
- `10-use-chat-tools-no-response.mdx`
- `14-stream-abort-handling.mdx`
- `15-abort-breaks-resumable-streams.mdx`
- `50-react-maximum-update-depth-exceeded.mdx`
- `02-chatbot.mdx`
- `03-chatbot-message-persistence.mdx`
- `03-chatbot-resume-streams.mdx`
- `21-transport.mdx`
- `50-stream-protocol.mdx`
- `06-advanced/02-stopping-streams.mdx`
- `07-reference/02-ai-sdk-ui/01-use-chat.mdx`
- `02-foundations/05-streaming.mdx`

## Findings Matrix

### A) Transport and proxy buffering

1. Streaming can look "stale" even when backend streams correctly if deployment/proxy buffers output.

- Recommended headers from SDK docs:
  - `Transfer-Encoding: chunked`
  - `Connection: keep-alive`
  - `Content-Encoding: none` (especially behind proxy/compression middleware)

Confidence: High

### B) Message identity and duplication

2. `toUIMessageStreamResponse` may create new assistant IDs unless `originalMessages` is provided.

- Result: duplicate/replaced assistant rendering in `useChat` UIs.

Confidence: High

### C) Status semantics vs visible text

3. `status === "streaming"` means connection/stream is live, not that text parts are already present.

- Loader logic should be content-aware (check last assistant parts/text availability).

Confidence: High

### D) Stale dynamic request values

4. Hook-level `body` values can become stale when derived from mutable component state.

- Recommendation: send dynamic values via `sendMessage(..., { body })` or function + `ref.current`.

Confidence: High

### E) Protocol mismatch cases

5. `useChat` expects UI message data stream protocol by default.

- If backend returns plain text/raw stream, configure text stream protocol/transport explicitly.

Confidence: High

### F) Tools and continuation behavior

6. Missing tool result wiring can cause apparent "no response" / stalled assistant.

- Ensure conversion to model messages (`convertToModelMessages`) and complete tool result flow.

Confidence: High

### G) Abort/resume interaction

7. Resume mode and abort behavior are currently incompatible by design.

- If `resume: true`, do not rely on stop/abort UX for the same flow.

Confidence: High

### H) Render pressure and apparent lag

8. Heavy rendering on every chunk can look glitchy/delayed.

- Use `experimental_throttle` for chunk update cadence control.

Confidence: Medium-High

### I) Abort handling for UI streams

9. When using `toUIMessageStreamResponse`, aborted streams can skip expected completion behavior unless abort consumption is wired correctly.

- Recommendation from docs: pass `consumeSseStream: consumeStream` when relying on abort-aware completion logic.

Confidence: Medium-High

### J) Resume mode compatibility

10. `resume: true` and abort/stop are not compatible in current SDK behavior.

- Must choose one behavior per chat surface.

Confidence: High

## Repo-Specific Assessment

1. Main dashboard chat has strong baseline hardening.

- `app/api/chat/[id]/route.ts` already passes `originalMessages: generationMessages`.
- Client flow in `app/(dashboard)/dashboard/chat/components/chat-session.tsx` keeps `useChat` state at stable session level and renders from `messages.parts`.

2. Agent-builder chat route has an important gap.

- `app/api/agent-builder/chat/route.ts` currently returns `result.toUIMessageStreamResponse()` without `originalMessages`.
- This aligns with the duplication/replacement symptom class documented by AI SDK troubleshooting.

3. Response-header hardening is not yet applied consistently to streaming routes.

- Could still cause deploy/proxy buffering symptoms despite correct server token generation.

4. Status-vs-content logic is mostly handled in dashboard chat, but should be reviewed for all chat-like surfaces.

- Especially custom loaders in agent-builder and any route-specific chat UI.

5. Current dashboard chat does not use `resume: true` and does expose stop semantics.

- This is consistent with SDK constraints (abort without resume).

## Final Recommended Fixes (implementation-ready)

Priority P0 (implement first)

1. Add `originalMessages` to agent-builder `toUIMessageStreamResponse`.
2. Add stream headers to streaming endpoints used by `useChat`:
   - `Transfer-Encoding: chunked`
   - `Connection: keep-alive`
   - `Content-Encoding: none`

Priority P1

3. Audit all loaders to ensure they depend on assistant content presence, not just `status === "streaming"`.
4. Validate no dynamic chat config is sent via stale hook-captured `body` values.
5. If abort-aware cleanup is needed in `onFinish`, add `consumeSseStream: consumeStream` for those routes.

Priority P2

6. Keep protocol alignment explicit when any route uses raw text streaming.
7. Apply `experimental_throttle` selectively on heavy markdown/tool-render paths where chunk-by-chunk updates are expensive.

## What Is Not The Primary Root Cause Here

- The classic React stale closure bug from manual `setMessages([...messages, ...])` appears in custom hand-rolled chat state examples.
- In this repo's main chat path, `useChat` is already the state source of truth, so that exact bug pattern is not the dominant issue.

## Implementation Gate

This report is now sufficient to start implementation with high confidence:

- P0 changes are directly supported by current AI SDK docs and match observed repo gaps.
- P1/P2 items are optimization and consistency hardening, not speculative rewrites.

## Endpoint Checklist (for implementation phase)

1. `app/api/chat/[id]/route.ts`

- Keep `originalMessages` (already present).
- Add streaming header hardening.
- Consider `consumeSseStream` only if we add abort-specific `onFinish` branching that must always run.

2. `app/api/agent-builder/chat/route.ts`

- Add `originalMessages`.
- Add streaming header hardening.

3. Any additional `useChat` API route introduced later

- Ensure `convertToModelMessages(messages)` is used.
- Ensure response protocol matches client transport (`toUIMessageStreamResponse` for default data stream).
- If custom backend text stream is used, switch client to text stream transport/protocol explicitly.
