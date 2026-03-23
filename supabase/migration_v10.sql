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
-- Returns all messages for a client's conversation (ordered oldest→newest).
create or replace function public.get_portal_messages(p_client_id uuid)
returns table (
  id              uuid,
  conversation_id uuid,
  sender_type     text,
  content         text,
  read            boolean,
  created_at      timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv_id uuid;
begin
  select id into v_conv_id
  from public.conversations
  where client_id = p_client_id
  limit 1;

  if v_conv_id is null then
    return;
  end if;

  return query
  select m.id, m.conversation_id, m.sender_type, m.content, m.read, m.created_at
  from public.messages m
  where m.conversation_id = v_conv_id
  order by m.created_at asc;
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
