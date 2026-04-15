begin;

-- Normalize any accidental legacy sentinel values.
update public.chat_turn_pairs
set assistant_content = '__vera_pending_response__'
where assistant_content = '__PENDING__';

-- Remove stale pending rows when a completed row exists for the same chat/user/content.
delete from public.chat_turn_pairs p
where p.assistant_content = '__vera_pending_response__'
  and exists (
    select 1
    from public.chat_turn_pairs done
    where done.chat_id = p.chat_id
      and done.user_id = p.user_id
      and done.user_content = p.user_content
      and done.assistant_content <> '__vera_pending_response__'
  );

commit;