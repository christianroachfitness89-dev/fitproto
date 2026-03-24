-- migration_v12: include active program in get_portal_data
-- ──────────────────────────────────────────────────────────────
-- Re-creates get_portal_data to add a 'program' key containing
-- the client's active program assignment + full week/day schedule.
-- Backwards-compatible: clients with no program get program: null.

create or replace function public.get_portal_data(p_client_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_client  record;
  v_workouts jsonb;
  v_program  jsonb;
begin
  select name, status, goal, portal_sections
  into   v_client
  from   public.clients
  where  id = p_client_id;

  if not found then return null; end if;

  -- Individual assigned workouts (unchanged)
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

  -- Active program assignment with complete schedule
  select jsonb_build_object(
    'id',             p.id,
    'name',           p.name,
    'duration_weeks', p.duration_weeks,
    'start_date',     pa.start_date,
    'schedule', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'week_number', pw.week_number,
          'day_number',  pw.day_number,
          'workout', jsonb_build_object(
            'id',               w2.id,
            'name',             w2.name,
            'difficulty',       w2.difficulty,
            'duration_minutes', w2.duration_minutes
          )
        ) order by pw.week_number, pw.day_number
      ), '[]'::jsonb)
      from public.program_workouts pw
      join public.workouts w2 on w2.id = pw.workout_id
      where pw.program_id = p.id
    )
  ) into v_program
  from public.program_assignments pa
  join public.programs p on p.id = pa.program_id
  where pa.client_id = p_client_id
    and pa.active = true
  order by pa.created_at desc
  limit 1;

  return jsonb_build_object(
    'name',            v_client.name,
    'status',          v_client.status,
    'goal',            v_client.goal,
    'workouts',        v_workouts,
    'portal_sections', coalesce(v_client.portal_sections, array['workouts']::text[]),
    'program',         v_program
  );
end;
$$;

grant execute on function public.get_portal_data(uuid) to anon;
