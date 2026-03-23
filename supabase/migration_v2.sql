-- ============================================================
-- FitProto Migration v2
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- Adds: workout assignments, check-ins, client portal RPCs
-- ============================================================

-- ── 1. Direct workout → client assignments ──────────────────
create table if not exists public.client_workouts (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id)  on delete cascade,
  workout_id  uuid not null references public.workouts(id) on delete cascade,
  assigned_at timestamptz default now() not null,
  due_date    date,
  status      text not null default 'assigned'
              check (status in ('assigned', 'completed', 'skipped')),
  notes       text,
  created_at  timestamptz default now() not null
);

alter table public.client_workouts enable row level security;

create policy "Coach manages client workouts" on public.client_workouts for all using (
  client_id in (select id from public.clients where org_id = get_user_org_id())
);

-- ── 2. Progress check-ins ────────────────────────────────────
create table if not exists public.check_ins (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  checked_in_at date not null default current_date,
  weight_kg     decimal,
  body_fat_pct  decimal,
  notes         text,
  energy_level  int check (energy_level between 1 and 10),
  sleep_hours   decimal,
  created_at    timestamptz default now() not null
);

alter table public.check_ins enable row level security;

create policy "Coach manages check-ins" on public.check_ins for all using (
  client_id in (select id from public.clients where org_id = get_user_org_id())
);

-- ── 3. Client portal RPCs ────────────────────────────────────
-- Security-definer functions run as DB owner, callable by anon.
-- The client UUID in the URL acts as the access token.

create or replace function public.get_portal_data(p_client_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_client  record;
  v_workouts jsonb;
begin
  select name, status, goal into v_client
  from public.clients where id = p_client_id;

  if not found then return null; end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',          cw.id,
      'status',      cw.status,
      'assigned_at', cw.assigned_at,
      'due_date',    cw.due_date,
      'notes',       cw.notes,
      'workout', jsonb_build_object(
        'id',               w.id,
        'name',             w.name,
        'description',      w.description,
        'difficulty',       w.difficulty,
        'category',         w.category,
        'duration_minutes', w.duration_minutes
      )
    ) order by cw.assigned_at desc
  ), '[]'::jsonb) into v_workouts
  from public.client_workouts cw
  join public.workouts w on w.id = cw.workout_id
  where cw.client_id = p_client_id;

  return jsonb_build_object(
    'name',     v_client.name,
    'status',   v_client.status,
    'goal',     v_client.goal,
    'workouts', v_workouts
  );
end;
$$;

grant execute on function public.get_portal_data(uuid) to anon;

-- Mark a workout complete from the portal
create or replace function public.complete_portal_workout(
  p_client_workout_id uuid,
  p_client_id         uuid
) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.client_workouts
  set    status = 'completed'
  where  id        = p_client_workout_id
  and    client_id = p_client_id;
end;
$$;

grant execute on function public.complete_portal_workout(uuid, uuid) to anon;
