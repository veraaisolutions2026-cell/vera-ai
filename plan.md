## Plan: Vera Coach + Intelligence Layers & Shared PDF KB

Implement two product layers end-to-end: Vera Coach (chat + built-in agents only, no agent creation/editing, no KB management) and Vera Intelligence (full agent + knowledge-base capabilities). Use full DB-level plan ID replacement to `vera-coach` and `vera-intelligence`, add admin-manageable technical KB pages, expose simplified `My Files` for users (user-owned only), and add agent↔PDF linking where agent uploads can also surface in KB with linkage metadata.

**Steps**

1. Phase 1 — Product Layer Contract + Plan-ID Replacement Foundation
2. Define canonical plan IDs across code and DB as `vera-coach` and `vera-intelligence` (replace `free/pro/enterprise`) in type definitions, plan helpers, and subscription usage gates. _Blocks all later gating work._
3. Update billing/usage logic to read new plan IDs from `subscriptions.plan` and `billing_tiers.plan`, including admin analytics breakdown labels and any fallback behavior when plan is null. _Depends on step 2._
4. Create migration strategy for dev environment: one-time SQL map (`free/pro -> vera-coach`, `enterprise -> vera-intelligence`), reseed billing tiers, and regenerate Supabase types. _Depends on step 2; can run in parallel with step 3 after schema spec is fixed._
   Phase 1 completed on 2026-04-24.
5. Phase 2 — Data Model for Knowledge Base + Agent Linking (PDF-only)
6. Add KB schema objects: a shared file catalog table, an agent-file join table (many-to-many), and optional enum/status columns for ownership/scope metadata needed by UI (`admin` vs `user`, `linked-to-agent`). Keep PDF-only validation at API layer and schema constraints. _Depends on step 1 decisions; parallelizable with admin route shell scaffolding in step 9._
7. Add storage strategy using dedicated bucket for KB files (as decided), with policies for authenticated uploads and constrained reads through signed URLs/service pathways. _Depends on step 6._
8. Add DB query modules for KB CRUD + linking operations with strict ownership checks (admin global management endpoints + user-scoped `My Files` endpoints). _Depends on steps 6-7._
   Phase 2 completed on 2026-04-24.
9. Phase 3 — Admin Layer UI/Routes (Sidebar + Pages)
10. Add admin sidebar routes/pages for `vera-coach` and `vera-intelligence` as first-class admin sections (normal sidebar navigation). These pages manage feature availability and package behavior rules.
11. Build admin KB management under Vera Intelligence: upload/list/delete PDFs, inspect link usage, and attach/detach files to agents from one place. _Depends on steps 6-8._
12. Add admin controls that configure layer capabilities (Coach restrictions vs Intelligence capabilities) in persistent config so runtime gates are server-enforced, not UI-only. _Depends on step 2 and step 10._
    Phase 3 completed on 2026-04-24.
13. Phase 4 — Dashboard/User Experience Split by Layer
14. Enforce Coach behavior: users can chat and use built-in agents in selector, but cannot access custom-agent CRUD routes or KB management routes/APIs. _Depends on step 12._
15. Enforce Intelligence behavior: users can access agent features and `My Files`; `My Files` displays only user-owned files, not admin private files. _Depends on steps 8 and 12._
16. Update dashboard navigation and route guards to hide/deny unavailable features per active plan, including direct URL access handling via server redirects/403 responses. _Depends on steps 14-15._
    Phase 4 completed on 2026-04-24.
17. Phase 5 — Agent + Knowledge Base Integration
18. Extend agent create/edit flows (admin and user-facing where permitted) to show attachable KB PDFs and current links.
19. Support direct file upload from agent screens: uploaded file is stored in KB catalog, auto-linked to current agent, and visible in KB UI with linkage indicator and delete/unlink controls. _Depends on steps 8 and 11._
20. Integrate linked PDFs into chat request assembly for eligible users/agents (attach selected PDFs as file parts in each request, initial version), preserving existing attachment/message-part architecture. _Depends on steps 14-19._
    Phase 5 completed on 2026-04-24.
21. Phase 6 — Migration Tooling, Observability, and Hardening
22. Add app-level migration tooling/scripts around Supabase SQL workflow (generate/apply SQL artifacts + type regeneration command updates) aligned with your chosen “include app migration tooling” requirement.
23. Add audit logging/analytics touchpoints for KB uploads, links, and deletes (admin visibility), and ensure role/ownership checks are consistently server-side.
24. Update documentation for new plans, capability matrix, schema, API contracts, and operational runbook for migrations.
    Phase 6 completed on 2026-04-24.

**Relevant files**

- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/app/(admin)/admin/components/admin-sidebar.tsx — add Vera Coach / Vera Intelligence nav entries.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/app/(admin)/layout.tsx — preserve admin gating and extend layer-management access assumptions.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/app/(admin)/components/admin-shell.tsx — ensure new admin pages follow existing shell pattern.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/app/(admin)/admin/agents/components/agent-form.tsx — add KB link UI for admin-managed agents.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/app/(dashboard)/components/sidebar.tsx — plan-aware feature visibility (agents/my-files links).
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/app/(dashboard)/dashboard/agents/page.tsx — enforce Coach/Intelligence access behavior.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/app/(dashboard)/dashboard/chat/page.tsx — keep built-in agent usage available in Coach.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/app/(dashboard)/dashboard/chat/[id]/page.tsx — enforce plan-compatible agent selection and request context.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/actions/agent-actions.ts — enforce plan/ownership checks in server actions.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/lib/billing-plans.ts — replace PlanId model and features matrix to two paid layers.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/lib/db/usage-limits.ts — gate availability by new plan IDs.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/lib/db/subscriptions.ts — ensure subscription reads/writes align with new canonical plan IDs.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/lib/db/admin.ts — update admin analytics plan buckets and plan labels.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/lib/db/agents.ts — merge/filter behavior for built-in vs user agents under layer rules.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/lib/chat-attachments.ts — reuse file-part architecture for KB-linked PDF injection.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/app/api/chat/upload/route.ts — reference PDF validation/storage pattern for KB upload routes.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/app/api/chat/[id]/route.ts — integrate linked-KB PDF parts into model request construction.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/types/supabase.ts — regenerate after schema/plan changes.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/types/database.ts — update compatibility layer types for new tables/plan IDs.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/package.json — add/update migration-tooling scripts.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/docs/database-schema.md — document new KB/link tables and plan semantics.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/docs/architecture.md — update layer capability model and runtime flow.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/docs/auth-and-security.md — document server-side enforcement for plan-based access and KB ownership.
- /Users/sharjeel/My Data/Work/Business/Products/vera-ai/docs/chat-system.md — document how linked KB PDFs enter chat requests.

**Verification**

1. Run full static checks after each phase: `pnpm typecheck` and `pnpm lint`.
2. Validate plan migration path in SQL editor: new plan IDs present in `subscriptions`/`billing_tiers`; old IDs removed or mapped as expected.
3. Validate admin paths manually: sidebar shows Vera Coach and Vera Intelligence pages; only admins can access.
4. Validate Coach user manually: built-in agent usage in chat works; agent CRUD routes and KB management routes/API calls are blocked server-side.
5. Validate Intelligence user manually: agent features enabled; `My Files` shows only user-owned files.
6. Validate KB upload constraints: only PDF accepted; storage path created in dedicated bucket; metadata row created.
7. Validate agent-linking flow: attach existing KB file to agent, upload from agent page, verify auto-link and KB linkage indicator, then delete/unlink behavior.
8. Validate chat grounding: linked PDFs are attached to request for eligible agent and no duplicate user-message behavior is introduced.
9. Regenerate and verify types: update `types/supabase.ts` and confirm no PlanId/type regressions.

**Decisions**

- Canonical plans are fully replaced at DB/app level with `vera-coach` and `vera-intelligence`.
- Package selection is handled only in `/dashboard/billing` with exactly two cards: Vera Coach and Vera Intelligence.
- Separate dashboard package pages/routes are removed from scope.
- Migration can be destructive/non-critical for current data (development-stage tolerance accepted).
- Coach package: chat + built-in agents only; no custom agent create/edit; no KB management.
- Intelligence package: includes agent + KB feature set.
- Agent-file relationship is many-to-many.
- Dedicated knowledge-base storage bucket is required.
- Runtime KB ingestion (v1): attach selected PDFs as file parts per request.
- Direct agent uploads should also appear in KB with linkage visibility and delete controls.
- User-facing file UX is simplified: users see only their own files in `My Files`; admin files remain private/technical.

**Scope boundaries**

- Included: schema/model, admin pages, user gating, KB upload/linking flows, plan replacement, migration/tooling, docs.
- Excluded (for later phase): embeddings/vector retrieval, OCR pipeline, advanced semantic search ranking, cross-tenant sharing beyond defined plan ownership model.
