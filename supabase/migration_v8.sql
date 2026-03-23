-- migration_v8: portal session detail RPC

-- Returns all exercises + set data for a single completed workout log.
-- Accessible by the client themselves (anon, using client_id match).
create or replace function public.get_portal_session_detail(
  p_client_id    uuid,
  p_workout_log_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'workout_name',  w.name,
    'completed_at',  wl.completed_at,
    'notes',         wl.notes,
    'exercises',     coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'exercise_id',   we.id,
          'name',          e.name,
          'muscle_group',  e.muscle_group,
          'metric_type',   e.metric_type,
          'order_index',   we.order_index,
          'sets',          coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'set_number',       sl.set_number,
                'reps_achieved',    sl.reps_achieved,
                'weight_used',      sl.weight_used,
                'duration_seconds', sl.duration_seconds,
                'distance_meters',  sl.distance_meters,
                'rpe',              sl.rpe
              )
              order by sl.set_number
            )
            from public.workout_set_logs sl
            where sl.workout_log_id = wl.id
              and sl.workout_exercise_id = we.id
          ), '[]'::jsonb)
        )
        order by we.order_index
      )
      from public.workout_exercises we
      join public.exercises e on e.id = we.exercise_id
      where we.workout_id = wl.workout_id
    ), '[]'::jsonb)
  )
  from public.workout_logs wl
  join public.workouts w on w.id = wl.workout_id
  where wl.id        = p_workout_log_id
    and wl.client_id = p_client_id
$$;

grant execute on function public.get_portal_session_detail(uuid, uuid) to anon;
