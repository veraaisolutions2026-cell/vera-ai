begin;

-- Normalize legacy pending sentinel values.
update public.chat_turn_pairs
set assistant_content = '__vera_pending_response__'
where assistant_content = '__PENDING__';

-- Ensure at most one pending row per chat/user/content.
create unique index if not exists chat_turn_pairs_unique_pending_content_idx
  on public.chat_turn_pairs (chat_id, user_id, user_content)
  where assistant_content = '__vera_pending_response__';

-- Support fast content-based lookups used by reconciliation.
create index if not exists chat_turn_pairs_lookup_content_idx
  on public.chat_turn_pairs (chat_id, user_id, user_content, created_at desc);

create or replace function public.chat_turn_pairs_normalize_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assistant_content = '__PENDING__' then
    new.assistant_content := '__vera_pending_response__';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_chat_turn_pairs_normalize_pending on public.chat_turn_pairs;
create trigger trg_chat_turn_pairs_normalize_pending
before insert or update on public.chat_turn_pairs
for each row
execute function public.chat_turn_pairs_normalize_pending();

create or replace function public.chat_turn_pairs_cleanup_stale_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assistant_content <> '__vera_pending_response__' then
    delete from public.chat_turn_pairs p
    where p.chat_id = new.chat_id
      and p.user_id = new.user_id
      and p.user_content = new.user_content
      and p.turn_key <> new.turn_key
      and p.assistant_content = '__vera_pending_response__';
  end if;

  return null;
end;
$$;

drop trigger if exists trg_chat_turn_pairs_cleanup_stale_pending on public.chat_turn_pairs;
create trigger trg_chat_turn_pairs_cleanup_stale_pending
after insert or update on public.chat_turn_pairs
for each row
execute function public.chat_turn_pairs_cleanup_stale_pending();

alter table public.chat_turn_pairs enable row level security;

drop policy if exists "chat_turn_pairs_select_own" on public.chat_turn_pairs;
create policy "chat_turn_pairs_select_own"
  on public.chat_turn_pairs
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "chat_turn_pairs_insert_own" on public.chat_turn_pairs;
create policy "chat_turn_pairs_insert_own"
  on public.chat_turn_pairs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "chat_turn_pairs_update_own" on public.chat_turn_pairs;
create policy "chat_turn_pairs_update_own"
  on public.chat_turn_pairs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "chat_turn_pairs_delete_own" on public.chat_turn_pairs;
create policy "chat_turn_pairs_delete_own"
  on public.chat_turn_pairs
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Remove stale pending rows when a completed row exists for same content.
delete from public.chat_turn_pairs p
where p.assistant_content = '__vera_pending_response__'
  and exists (
    select 1
    from public.chat_turn_pairs done
    where done.chat_id = p.chat_id
      and done.user_id = p.user_id
      and done.user_content = p.user_content
      and done.turn_key <> p.turn_key
      and done.assistant_content <> '__vera_pending_response__'
  );

commit;
