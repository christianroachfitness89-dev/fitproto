-- ============================================================
-- FitProto Migration v7
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- Client portal: section access control + history/metrics RPCs
-- ============================================================

-- 1. Add portal_sections column to clients
--    Default: ['workouts'] so existing clients are not affected.
alter table public.clients
  add column if not exists portal_sections text[]
  default array['workouts']::text[];

-- ──────────────────────────────────────────────────────────────
-- 2. Update get_portal_data to include portal_sections
--    (replaces v2 version)
create or replace function public.get_portal_data(p_client_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_client  record;
  v_workouts jsonb;
begin
  select name, status, goal, portal_sections
  into   v_client
  from   public.clients
  where  id = p_client_id;

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
    'name',            v_client.name,
    'status',          v_client.status,
    'goal',            v_client.goal,
    'workouts',        v_workouts,
    'portal_sections', coalesce(v_client.portal_sections, array['workouts']::text[])
  );
end;
$$;

grant execute on function public.get_portal_data(uuid) to anon;

-- ──────────────────────────────────────────────────────────────
-- 3. get_portal_history — completed workout sessions for history view
create or replace function public.get_portal_history(p_client_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_result jsonb;
begin
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',           wl.id,
      'completed_at', wl.completed_at,
      'notes',        wl.notes,
      'workout_name', w.name,
      'set_count',    (select count(*) from public.workout_set_logs where workout_log_id = wl.id),
      'exercises',    (
        select coalesce(
          to_jsonb(array_agg(distinct we2.exercise_name)),
          '[]'::jsonb
        )
        from public.workout_set_logs wsl2
        join public.workout_exercises we2 on we2.id = wsl2.workout_exercise_id
        where wsl2.workout_log_id = wl.id
      )
    ) order by wl.completed_at desc
  ), '[]'::jsonb) into v_result
  from public.workout_logs wl
  join public.workouts w on w.id = wl.workout_id
  where wl.client_id = p_client_id;

  return v_result;
end;
$$;

grant execute on function public.get_portal_history(uuid) to anon;

-- ──────────────────────────────────────────────────────────────
-- 4. get_portal_metrics — check-in data for metrics view
create or replace function public.get_portal_metrics(p_client_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_result jsonb;
begin
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',            ci.id,
      'checked_in_at', ci.checked_in_at,
      'weight_kg',     ci.weight_kg,
      'body_fat_pct',  ci.body_fat_pct,
      'energy_level',  ci.energy_level,
      'sleep_hours',   ci.sleep_hours,
      'notes',         ci.notes
    ) order by ci.checked_in_at desc
  ), '[]'::jsonb) into v_result
  from public.check_ins ci
  where ci.client_id = p_client_id;

  return v_result;
end;
$$;

grant execute on function public.get_portal_metrics(uuid) to anon;
