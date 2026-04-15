begin;

create table if not exists public.chat_message_branches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  chat_id uuid not null,
  user_id uuid not null,
  source_message_id text not null,
  branch_index integer not null,
  content text not null,
  is_active boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  check (branch_index >= 0),
  check (length(trim(content)) > 0)
);

create unique index if not exists chat_message_branches_unique_variant_idx
  on public.chat_message_branches (chat_id, user_id, source_message_id, branch_index);

create unique index if not exists chat_message_branches_unique_active_idx
  on public.chat_message_branches (chat_id, user_id, source_message_id)
  where is_active = true;

create index if not exists chat_message_branches_lookup_idx
  on public.chat_message_branches (chat_id, user_id, source_message_id, created_at asc);

alter table public.chat_message_branches enable row level security;

drop policy if exists "chat_message_branches_select_own" on public.chat_message_branches;
create policy "chat_message_branches_select_own"
  on public.chat_message_branches
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "chat_message_branches_insert_own" on public.chat_message_branches;
create policy "chat_message_branches_insert_own"
  on public.chat_message_branches
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "chat_message_branches_update_own" on public.chat_message_branches;
create policy "chat_message_branches_update_own"
  on public.chat_message_branches
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "chat_message_branches_delete_own" on public.chat_message_branches;
create policy "chat_message_branches_delete_own"
  on public.chat_message_branches
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_chat_message_branch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_chat_message_branches_updated_at on public.chat_message_branches;
create trigger trg_chat_message_branches_updated_at
before update on public.chat_message_branches
for each row
execute function public.set_chat_message_branch_updated_at();

commit;