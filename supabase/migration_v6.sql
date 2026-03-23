-- ============================================================
-- FitProto Migration v6
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- Client portal: workout detail + session logging RPCs
-- ============================================================

-- Returns a workout's exercises + sets for display in the portal.
-- Validates that the client_workout belongs to the given client.
create or replace function get_portal_workout_detail(
  p_client_workout_id uuid,
  p_client_id         uuid
) returns json
language plpgsql
security definer
as $$
declare
  v_result json;
begin
  -- Ownership check
  if not exists (
    select 1 from public.client_workouts
    where id = p_client_workout_id and client_id = p_client_id
  ) then
    return null;
  end if;

  select json_build_object(
    'client_workout_id', cw.id,
    'workout_name',        w.name,
    'workout_description', w.description,
    'exercises', (
      select json_agg(
        json_build_object(
          'id',           we.id,
          'name',         we.exercise_name,
          'order_index',  we.order_index,
          'metric_type',  coalesce(e.metric_type, 'reps_weight'),
          'muscle_group', e.muscle_group,
          'sets', (
            select json_agg(
              json_build_object(
                'set_number',        ws.set_number,
                'reps',              ws.reps,
                'weight',            ws.weight,
                'duration_seconds',  ws.duration_seconds,
                'distance_meters',   ws.distance_meters,
                'rest_seconds',      ws.rest_seconds
              ) order by ws.set_number
            )
            from public.workout_sets ws
            where ws.workout_exercise_id = we.id
          )
        ) order by we.order_index
      )
      from public.workout_exercises we
      left join public.exercises e on e.id = we.exercise_id
      where we.workout_id = w.id
    )
  ) into v_result
  from public.client_workouts cw
  join public.workouts w on w.id = cw.workout_id
  where cw.id = p_client_workout_id;

  return v_result;
end;
$$;

grant execute on function get_portal_workout_detail to anon;

-- ──────────────────────────────────────────────────────────────
-- Logs a completed session (workout_log + per-set workout_set_logs)
-- then marks the assignment as completed.
-- p_set_logs format: [{workout_exercise_id, set_number, reps_achieved,
--   weight_used, duration_seconds, distance_meters, rpe}, ...]
create or replace function log_portal_workout(
  p_client_workout_id uuid,
  p_client_id         uuid,
  p_completed_at      text    default null,
  p_notes             text    default null,
  p_set_logs          jsonb   default '[]'::jsonb
) returns json
language plpgsql
security definer
as $$
declare
  v_workout_id uuid;
  v_log_id     uuid;
  v_at         timestamptz;
begin
  -- Validate ownership
  select workout_id into v_workout_id
  from public.client_workouts
  where id = p_client_workout_id and client_id = p_client_id;

  if not found then
    return json_build_object('error', 'Not found');
  end if;

  v_at := coalesce(nullif(p_completed_at, '')::timestamptz, now());

  -- Create workout_log
  insert into public.workout_logs (
    client_id, workout_id, client_workout_id, completed_at, notes
  )
  values (p_client_id, v_workout_id, p_client_workout_id, v_at, nullif(p_notes, ''))
  returning id into v_log_id;

  -- Insert set logs (skip rows with no exercise id)
  if jsonb_array_length(p_set_logs) > 0 then
    insert into public.workout_set_logs (
      workout_log_id, workout_exercise_id, set_number,
      reps_achieved, weight_used, duration_seconds, distance_meters, rpe
    )
    select
      v_log_id,
      (s->>'workout_exercise_id')::uuid,
      (s->>'set_number')::int,
      nullif(s->>'reps_achieved',    '')::decimal,
      nullif(s->>'weight_used',      '')::decimal,
      nullif(s->>'duration_seconds', '')::int,
      nullif(s->>'distance_meters',  '')::decimal,
      nullif(s->>'rpe',              '')::int
    from jsonb_array_elements(p_set_logs) s
    where (s->>'workout_exercise_id') is not null
      and (s->>'set_number') is not null;
  end if;

  -- Mark assignment completed
  update public.client_workouts
  set status = 'completed'
  where id = p_client_workout_id and client_id = p_client_id;

  return json_build_object('success', true, 'log_id', v_log_id);
end;
$$;

grant execute on function log_portal_workout to anon;
