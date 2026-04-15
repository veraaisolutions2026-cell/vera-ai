begin;

create table if not exists public.usage_events (
  event_key text primary key,
  created_at timestamptz not null default now(),
  occurred_at timestamptz not null default now(),
  user_id uuid not null,
  chat_id uuid,
  turn_key text,
  source text not null,
  event_type text not null,
  request_trigger text,
  model text not null,
  plan text not null,
  billing_interval text,
  request_count integer not null default 1,
  user_message_chars integer not null default 0,
  assistant_message_chars integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  check (source in ('chat', 'agent-builder')),
  check (event_type in ('chat_request_completed')),
  check (plan in ('free', 'pro', 'enterprise')),
  check (request_count > 0),
  check (user_message_chars >= 0),
  check (assistant_message_chars >= 0)
);

create index if not exists usage_events_user_occurred_at_idx
  on public.usage_events (user_id, occurred_at desc);

create index if not exists usage_events_plan_occurred_at_idx
  on public.usage_events (plan, occurred_at desc);

alter table public.usage_events enable row level security;

drop policy if exists "usage_events_select_own" on public.usage_events;
create policy "usage_events_select_own"
  on public.usage_events
  for select
  to authenticated
  using (auth.uid() = user_id);

alter table public.billing_tiers
  add column if not exists monthly_request_limit integer;

update public.billing_tiers
set
  monthly_request_limit = case plan
    when 'free' then 40
    when 'pro' then 500
    when 'enterprise' then 1500
    else monthly_request_limit
  end,
  features = case plan
    when 'free' then '["3 built-in agents", "About 40 requests / month", "Export to Markdown & text", "Community support"]'::jsonb
    when 'pro' then '["Unlimited built-in agents", "Up to 10 custom agents", "About 500 requests / month", "PDF/Markdown/Text export", "File uploads", "Priority support"]'::jsonb
    when 'enterprise' then '["Everything in Pro", "Unlimited custom agents", "About 1,500 requests / month", "Team workspace", "White-label", "API access", "Dedicated onboarding", "SLA contracts"]'::jsonb
    else features
  end,
  updated_at = now();

commit;