# GitHub Copilot Instructions - Vera AI

## What Is This

Vera AI is an **auditing software solution** delivered as two separate products on a shared codebase:

- **Deliverable 1** - Agent AI Workspace: a deployed AI chat platform where auditors build and manage custom AI agents (the core product)
- **Deliverable 2** - Company Marketing Website: a professional public-facing site for Vera AI

---

## Tech Stack

| Layer                | Technology                                                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework            | Next.js 15+ (App Router, RSC-first)                                                                                                                   |
| Language             | TypeScript (strict mode)                                                                                                                              |
| Database & Auth      | Supabase (PostgreSQL + Supabase Auth) - use `@supabase/ssr`, **not** `auth-helpers`                                                                   |
| AI Runtime           | AI SDK 5 - `useChat` with modular transports, decoupled Zustand-compatible state, automatic tool input streaming                                      |
| AI Provider          | `@ai-sdk/anthropic` for Claude streaming; `@anthropic-ai/sdk` raw client for Files API (PDF/Word upload)                                              |
| AI UI Components     | shadcn/ui AI components (`shadcn.io/ai`): `Message`, `Conversation`, `ToolCall`, `ReasoningBlock` - pass `message.parts` for automatic part rendering |
| Animation Engine     | Motion (Framer Motion v12) - subtle, purposeful micro-interactions only                                                                               |
| Animation Primitives | Motion Primitives - text character reveals, animated numbers, pre-built patterns                                                                      |
| UI Eye Candy         | Magic UI - `AnimatedBeam` (agent graph visual), `NumberTicker` (stats), `BlurFade` (panel entrances)                                                  |
| Payments             | Stripe Subscriptions                                                                                                                                  |
| Deployment           | Vercel                                                                                                                                                |
| Styling              | Tailwind CSS v4 + shadcn/ui - dark mode default (`defaultTheme="dark"`)                                                                               |
| State                | Zustand (client), React Server Components (server)                                                                                                    |
| Forms                | React Hook Form + Zod                                                                                                                                 |

---

## Naming Conventions

- **All files and folders use kebab-case**: `agent-builder.tsx`, `chat-session.tsx`, `use-chat-stream.ts`
- No uppercase, no camelCase, no spaces in file or folder names
- Component exports may use PascalCase internally but their file must be kebab-case
- Route segments follow Next.js App Router conventions: `app/dashboard/agents/page.tsx`
- Test files: `agent-builder.test.tsx` co-located next to the file being tested

---

## Folder & Route Structure

### Principle

Every route has its own `components/` folder. Shared components between sibling routes live in a `components/` folder at the shared parent level. The root-level `components/` folder is for truly global UI primitives used across the whole codebase (shadcn/ui, layout wrappers, etc.).

### Example

```
app/
  (dashboard)/
    dashboard/
      page.tsx
      components/         ← dashboard-specific components
    agents/
      page.tsx
      components/         ← agents route components
      [id]/
        page.tsx
        components/
    chat/
      page.tsx
      components/
    components/           ← shared across dashboard, agents, chat
  (auth)/
    login/
      page.tsx
      components/
    register/
      page.tsx
      components/
  (marketing)/
    page.tsx              ← home
    components/           ← home page sections
    product/
      page.tsx
      components/
    pricing/
      page.tsx
      components/
    services/
      page.tsx
      components/
    contact/
      page.tsx
      components/
    legal/
      page.tsx
      components/
    components/           ← shared across all marketing pages (nav, footer)

components/               ← global: shadcn/ui, theme-provider, global nav
hooks/                    ← global custom hooks
lib/                      ← utilities, supabase client, stripe client, validators
```

---

## Deliverable 1 - Agent AI Workspace (Dashboard)

Route group: `app/(dashboard)/`

### Features to build

- **Streaming chat** - real-time via Anthropic Claude API, conversation history, multi-turn context
- **Agent Builder** - create, edit, clone, delete agents; set name, icon, system prompt, output format
- **Authentication** - login, register, password reset via Supabase Auth
- **User Roles** - Admin (full access + billing), User (chat + agents), Viewer (read-only)
- **File Upload** - PDF and Word documents in a chat session
- **Export** - conversations as PDF, Markdown, plain text
- **Model Selector** - switch between Claude models (Sonnet, Haiku, Opus) per session
- **Stripe Billing** - subscription management, plan gating by role

### Routes

```
/login
/register
/forgot-password
/dashboard              ← overview/home
/dashboard/chat         ← new chat
/dashboard/chat/[id]    ← existing session
/dashboard/agents       ← agent list
/dashboard/agents/new   ← create agent
/dashboard/agents/[id]  ← edit agent
/dashboard/billing      ← subscription (Admin only)
/dashboard/settings     ← account settings
```

---

## Deliverable 2 - Marketing Website

Route group: `app/(marketing)/`

### Pages

```
/                       ← Home: hero, value proposition, key stats, CTA
/product                ← how agents work, 3-step explainer, builder showcase
/pricing                ← three tiers, annual discount toggle, comparison table
/services               ← custom agents, white-label, onboarding, API access
/contact                ← enquiry form + Calendly embed
/legal/privacy-policy
/legal/terms-of-service
```

---

## Design System

### Aesthetic

- **Reference**: Linear.app and Vercel Dashboard - clean, editorial, institutional
- **Dark theme**: deep charcoal (`#0E0E10` background, not pure black)
- **Accent**: warm single accent colour (not blue, not generic purple) - TBD but currently `amber-500` range
- **Typography**: sharp, tight, high-contrast - not rounded or bubbly

### Rules

- No gradient backgrounds on buttons - flat, bordered, or solid only
- No generic SaaS "hero with dashboard screenshot + 3 feature icons" layouts
- Spacing should be generous and intentional - not cramped
- Icons: Lucide only (already in shadcn/ui)
- No stock photo hero images - use abstract geometry, grid patterns, or no illustration at all
- Motion: subtle, purposeful - page transitions and micro-interactions only. No scroll-triggered animation spam
- Use Motion (Framer Motion v12) as the animation engine - not CSS animations for anything interactive
- Use Motion Primitives for text reveals and animated counters - do not roll your own
- Use Magic UI `AnimatedBeam` for agent graph visuals, `NumberTicker` for stats, `BlurFade` for panel entrances
- Never animate layout properties (width/height) - always use transform/opacity
- Use `cn()` from `@/lib/utils` for className composition (never string concatenation)

### Responsive

- Mobile-first: `375px` minimum
- Desktop cap: `1440px` max-width container
- All layouts must work at 375px, 768px, 1024px, 1440px

---

## Data & API Rules

- All Supabase calls in Server Components or Server Actions - never expose service key to client
- Use `createServerClient` from `@supabase/ssr` for server-side, `createBrowserClient` for client
- Validate all form inputs with Zod before any DB write
- Stripe webhooks must verify `stripe-signature` header before processing
- Anthropic API calls are server-only - never call from client components
- Row Level Security (RLS) must be enabled on all Supabase tables
- Role gating happens server-side - never rely on client-side role checks alone

---

## Performance Rules

- Prefer React Server Components by default - only use `'use client'` when needed (interactivity, browser APIs, hooks)
- Use `Promise.all()` for independent parallel data fetches - never sequential awaits
- Use `next/dynamic` with `ssr: false` for heavy client components (rich text editors, PDF viewers, charts)
- Import directly from packages - never from barrel files (e.g. `import { Button } from "@/components/ui/button"` not `@/components/ui`)
- Use `React.cache()` for per-request deduplication of server data fetches
- Images: always `next/image`, always include `width`, `height`, and `alt`
- Fonts: loaded via `next/font/google` at module level - already in `app/layout.tsx`

---

## What NOT to Do

- Do not use `'use client'` at the top level of route `page.tsx` files - fetch server-side and pass down
- Do not define components inside other components
- Do not use `any` TypeScript type - use `unknown` and narrow, or define proper types
- Do not call `console.log` in production code - use a proper logger or remove before commit
- Do not commit `.env.local` - use `.env.example` for documentation
- Do not use inline styles unless absolutely unavoidable - use Tailwind classes
- Do not create barrel `index.ts` files in component folders
- Do not add `baseUrl` to `tsconfig.json` - use `paths` directly (TypeScript 5+ feature)
- Do not use `@supabase/auth-helpers-nextjs` - use `@supabase/ssr` only
- Do not import AI SDK v4 patterns for `useChat` - AI SDK 5 has a different API; always check `ai` package docs
- Do not put Anthropic/Supabase/Stripe secret keys in client-accessible code
- Do not skip Zod validation on any user-facing form or API route input
- Do not use `router.push` for server-side navigation - use `redirect()` from `next/navigation`

---

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # server only

# Anthropic
ANTHROPIC_API_KEY=                 # server only

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=                 # server only
STRIPE_WEBHOOK_SECRET=             # server only
```

---

## Conventions at a Glance

| Thing            | Convention                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| File naming      | `kebab-case.tsx`                                                                                          |
| Component export | `export function AgentCard()` (named, not default) - except `page.tsx` and `layout.tsx` which use default |
| Route pages      | `export default function Page()`                                                                          |
| Hooks            | `use-[name].ts` → `export function use[Name]()`                                                           |
| Server actions   | `actions/[feature]-actions.ts`                                                                            |
| Types            | `types/[feature].ts` or co-located as `[feature].types.ts`                                                |
| DB queries       | `lib/db/[feature].ts` - all Supabase query functions here                                                 |
| CSS              | Tailwind utility classes, `cn()` for conditionals                                                         |
