-- ─── Migration v10: Portal messaging RPCs ─────────────────────
-- Allows client portal (unauthenticated) to get/create conversations
-- and send/receive messages without touching RLS-gated tables directly.

-- ── get_portal_conversation ────────────────────────────────────
-- Returns the conversation id for a client, creating one if absent.
create or replace function public.get_portal_conversation(p_client_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv_id uuid;
  v_org_id  uuid;
begin
  select org_id into v_org_id
  from public.clients
  where id = p_client_id;

  if not found then
    raise exception 'Client not found';
  end if;

  select id into v_conv_id
  from public.conversations
  where client_id = p_client_id
  limit 1;

  if v_conv_id is null then
    insert into public.conversations (org_id, client_id)
    values (v_org_id, p_client_id)
    returning id into v_conv_id;
  end if;

  return v_conv_id;
end;
$$;

-- ── get_portal_messages ────────────────────────────────────────
-- Returns all messages for a client's conversation as jsonb array (oldest→newest).
-- Uses jsonb (not RETURNS TABLE) to match the pattern of all other portal RPCs.
drop function if exists public.get_portal_messages(uuid);
create or replace function public.get_portal_messages(p_client_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv_id uuid;
  v_result  jsonb;
begin
  select id into v_conv_id
  from public.conversations
  where client_id = p_client_id
  limit 1;

  if v_conv_id is null then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',              m.id,
      'conversation_id', m.conversation_id,
      'sender_type',     m.sender_type,
      'content',         m.content,
      'read',            m.read,
      'created_at',      m.created_at
    ) order by m.created_at asc
  ), '[]'::jsonb) into v_result
  from public.messages m
  where m.conversation_id = v_conv_id;

  return v_result;
end;
$$;

-- ── send_portal_message ────────────────────────────────────────
-- Inserts a client-sent message and bumps last_message_at.
create or replace function public.send_portal_message(
  p_client_id uuid,
  p_content   text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv_id uuid;
  v_msg_id  uuid;
begin
  -- Get or create conversation
  v_conv_id := public.get_portal_conversation(p_client_id);

  insert into public.messages (conversation_id, sender_type, sender_id, content)
  values (v_conv_id, 'client', p_client_id, p_content)
  returning id into v_msg_id;

  update public.conversations
  set last_message_at = now()
  where id = v_conv_id;

  return v_msg_id;
end;
$$;

-- ── mark_portal_messages_read ──────────────────────────────────
-- Marks all coach messages in a conversation as read (used by coach inbox).
-- Not security-definer — coach must be authenticated (RLS handles access).
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.messages
  set read = true
  where conversation_id = p_conversation_id
    and sender_type = 'client'
    and read = false;
end;
$$;

-- ── Grants ──────────────────────────────────────────────────────
-- Client portal is unauthenticated (anon role) — must explicitly grant execute.
grant execute on function public.get_portal_conversation(uuid)       to anon;
grant execute on function public.get_portal_messages(uuid)           to anon;
grant execute on function public.send_portal_message(uuid, text)     to anon;
-- mark_conversation_read is called by the authenticated coach only.
grant execute on function public.mark_conversation_read(uuid)        to authenticated;
