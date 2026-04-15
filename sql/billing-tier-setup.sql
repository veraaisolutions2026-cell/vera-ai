-- Billing tier setup for Vera AI
-- Goal: ensure every existing/new user defaults to free tier,
-- and establish standard 3-tier plan metadata.

begin;

-- 1) Ensure one subscription row per user.
create unique index if not exists subscriptions_user_id_uidx
  on public.subscriptions (user_id);

-- 2) Backfill missing subscriptions as FREE tier for all current users.
insert into public.subscriptions (
  user_id,
  plan,
  status,
  billing_interval,
  cancel_at_period_end,
  created_at,
  updated_at
)
select
  p.id,
  'free',
  'active',
  null,
  false,
  now(),
  now()
from public.profiles p
left join public.subscriptions s on s.user_id = p.id
where s.user_id is null;

-- 3) Normalize any invalid plan/status values.
update public.subscriptions
set
  plan = case
    when plan in ('free', 'pro', 'enterprise') then plan
    else 'free'
  end,
  status = coalesce(status, 'active'),
  updated_at = now();

-- 4) Keep all newly created users on free tier by default.
create or replace function public.ensure_free_subscription_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (
    user_id,
    plan,
    status,
    billing_interval,
    cancel_at_period_end,
    created_at,
    updated_at
  )
  values (
    new.id,
    'free',
    'active',
    null,
    false,
    now(),
    now()
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_profiles_default_free_subscription on public.profiles;
create trigger trg_profiles_default_free_subscription
after insert on public.profiles
for each row
execute function public.ensure_free_subscription_for_profile();

-- 5) Optional plan catalog table for dashboard/admin queries and limits.
create table if not exists public.billing_tiers (
  plan text primary key,
  display_name text not null,
  monthly_price_usd integer not null,
  annual_price_usd integer not null,
  monthly_message_limit integer,
  monthly_request_limit integer,
  custom_agent_limit integer,
  features jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  check (plan in ('free', 'pro', 'enterprise'))
);

insert into public.billing_tiers (
  plan,
  display_name,
  monthly_price_usd,
  annual_price_usd,
  monthly_message_limit,
  monthly_request_limit,
  custom_agent_limit,
  features,
  updated_at
)
values
  (
    'free',
    'Starter',
    0,
    0,
    50,
    40,
    0,
    '["3 built-in agents", "About 40 requests / month", "Export to Markdown & text", "Community support"]'::jsonb,
    now()
  ),
  (
    'pro',
    'Pro',
    49,
    39,
    null,
    500,
    10,
    '["Unlimited built-in agents", "Up to 10 custom agents", "About 500 requests / month", "PDF/Markdown/Text export", "File uploads", "Priority support"]'::jsonb,
    now()
  ),
  (
    'enterprise',
    'Enterprise',
    149,
    119,
    null,
    1500,
    null,
    '["Everything in Pro", "Unlimited custom agents", "About 1,500 requests / month", "Team workspace", "White-label", "API access", "Dedicated onboarding", "SLA contracts"]'::jsonb,
    now()
  )
on conflict (plan) do update
set
  display_name = excluded.display_name,
  monthly_price_usd = excluded.monthly_price_usd,
  annual_price_usd = excluded.annual_price_usd,
  monthly_message_limit = excluded.monthly_message_limit,
  monthly_request_limit = excluded.monthly_request_limit,
  custom_agent_limit = excluded.custom_agent_limit,
  features = excluded.features,
  updated_at = now();

commit;
