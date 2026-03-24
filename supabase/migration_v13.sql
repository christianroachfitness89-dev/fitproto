-- migration_v13: portal RPC to start logging a program workout
-- ──────────────────────────────────────────────────────────────
-- Finds (or creates) a client_workout for the given workout so the
-- existing portal log overlay can be used from the program schedule.

create or replace function public.get_or_create_portal_program_workout(
  p_client_id uuid,
  p_workout_id uuid
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cw_id uuid;
  v_result jsonb;
begin
  if not exists (select 1 from public.clients where id = p_client_id) then
    return jsonb_build_object('error', 'not_found');
  end if;

  -- Reuse an existing assigned client_workout for the same workout
  select id into v_cw_id
  from public.client_workouts
  where client_id = p_client_id
    and workout_id = p_workout_id
    and status = 'assigned'
  order by assigned_at desc
  limit 1;

  -- Nothing found — create one on the fly
  if v_cw_id is null then
    insert into public.client_workouts (client_id, workout_id, status)
    values (p_client_id, p_workout_id, 'assigned')
    returning id into v_cw_id;
  end if;

  -- Return the full PortalWorkout structure expected by the log overlay
  select jsonb_build_object(
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
  ) into v_result
  from public.client_workouts cw
  join public.workouts w on w.id = cw.workout_id
  where cw.id = v_cw_id;

  return v_result;
end;
$$;

grant execute on function public.get_or_create_portal_program_workout(uuid, uuid) to anon;
