-- migration_v14: Plan view interactivity
-- 1. Re-create get_portal_tasks to include completed status
-- 2. Toggle task completion from the portal
-- 3. Reschedule an assigned workout from the portal

-- ── 1. get_portal_tasks (adds completed field) ─────────────────
CREATE OR REPLACE FUNCTION public.get_portal_tasks(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id',        t.id,
          'title',     t.title,
          'type',      t.type,
          'due_date',  to_char(t.due_date, 'YYYY-MM-DD'),
          'completed', t.completed
        )
        ORDER BY t.completed ASC, t.due_date ASC NULLS LAST, t.created_at ASC
      ),
      '[]'::jsonb
    )
    FROM tasks t
    WHERE t.client_id = p_client_id
  );
END;
$$;

-- ── 2. toggle_portal_task ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.toggle_portal_task(
  p_client_id uuid,
  p_task_id   uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate the task belongs to this client
  IF NOT EXISTS (
    SELECT 1 FROM tasks WHERE id = p_task_id AND client_id = p_client_id
  ) THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  UPDATE tasks
  SET completed = NOT completed
  WHERE id = p_task_id AND client_id = p_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_portal_task(uuid, uuid) TO anon;

-- ── 3. reschedule_portal_workout ──────────────────────────────
CREATE OR REPLACE FUNCTION public.reschedule_portal_workout(
  p_client_id         uuid,
  p_client_workout_id uuid,
  p_new_due_date      date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow moving assigned (not completed/skipped) workouts
  IF NOT EXISTS (
    SELECT 1 FROM client_workouts
    WHERE id = p_client_workout_id
      AND client_id = p_client_id
      AND status = 'assigned'
  ) THEN
    RAISE EXCEPTION 'Workout not found or not reschedulable';
  END IF;

  UPDATE client_workouts
  SET due_date = p_new_due_date
  WHERE id = p_client_workout_id
    AND client_id = p_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reschedule_portal_workout(uuid, uuid, date) TO anon;
