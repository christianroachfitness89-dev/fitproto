-- migration_v26: Attach metric definitions to habits and tasks

-- 1. Add metric_definition_id to habits (nullable — metric is optional)
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS metric_definition_id uuid
    REFERENCES metric_definitions(id) ON DELETE SET NULL;

-- 2. Add metric_definition_id to tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS metric_definition_id uuid
    REFERENCES metric_definitions(id) ON DELETE SET NULL;

-- 3. Update get_client_habits to include metric info
CREATE OR REPLACE FUNCTION get_client_habits(
  p_client_id uuid,
  p_date      date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',                   h.id,
        'name',                 h.name,
        'description',          h.description,
        'emoji',                h.emoji,
        'frequency',            h.frequency,
        'active',               h.active,
        'created_at',           h.created_at,
        'metric_definition_id', h.metric_definition_id,
        'metric_name',          md.name,
        'metric_unit',          md.unit,
        'metric_emoji',         md.emoji,
        'completed_today', EXISTS(
          SELECT 1 FROM habit_completions hc
          WHERE hc.habit_id = h.id AND hc.completed_date = p_date
        ),
        'streak', (
          SELECT COUNT(*)
          FROM habit_completions hc
          WHERE hc.habit_id = h.id
            AND hc.completed_date > p_date - INTERVAL '30 days'
            AND hc.completed_date <= p_date
        )
      )
      ORDER BY h.created_at ASC
    ),
    '[]'::jsonb
  )
  FROM habits h
  LEFT JOIN metric_definitions md ON md.id = h.metric_definition_id
  WHERE h.client_id = p_client_id
    AND h.active = true
    AND h.is_template = false
$$;

GRANT EXECUTE ON FUNCTION get_client_habits(uuid, date) TO anon;

-- 4. Update toggle_habit_completion to optionally log a metric value when completing
CREATE OR REPLACE FUNCTION toggle_habit_completion(
  p_client_id    uuid,
  p_habit_id     uuid,
  p_date         date    DEFAULT CURRENT_DATE,
  p_metric_value numeric DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  already         boolean;
  v_metric_def_id uuid;
  v_org_id        uuid;
BEGIN
  SELECT metric_definition_id, org_id
    INTO v_metric_def_id, v_org_id
    FROM habits
   WHERE id = p_habit_id AND client_id = p_client_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Habit not found';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM habit_completions
    WHERE habit_id = p_habit_id AND completed_date = p_date
  ) INTO already;

  IF already THEN
    DELETE FROM habit_completions WHERE habit_id = p_habit_id AND completed_date = p_date;
    RETURN false;
  ELSE
    INSERT INTO habit_completions (habit_id, client_id, completed_date)
    VALUES (p_habit_id, p_client_id, p_date)
    ON CONFLICT (habit_id, completed_date) DO NOTHING;

    -- Optionally log a metric value alongside the completion
    IF p_metric_value IS NOT NULL AND v_metric_def_id IS NOT NULL THEN
      INSERT INTO custom_metric_values (org_id, client_id, definition_id, value, logged_at)
      VALUES (v_org_id, p_client_id, v_metric_def_id, p_metric_value, p_date)
      ON CONFLICT DO NOTHING;
    END IF;

    RETURN true;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION toggle_habit_completion(uuid, uuid, date, numeric) TO anon;

-- 5. Update get_portal_tasks to include metric info
CREATE OR REPLACE FUNCTION public.get_portal_tasks(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id',                   t.id,
          'title',                t.title,
          'type',                 t.type,
          'due_date',             to_char(t.due_date, 'YYYY-MM-DD'),
          'completed',            t.completed,
          'metric_definition_id', t.metric_definition_id,
          'metric_name',          md.name,
          'metric_unit',          md.unit,
          'metric_emoji',         md.emoji
        )
        ORDER BY t.completed ASC, t.due_date ASC NULLS LAST, t.created_at ASC
      ),
      '[]'::jsonb
    )
    FROM tasks t
    LEFT JOIN metric_definitions md ON md.id = t.metric_definition_id
    WHERE t.client_id = p_client_id
      AND t.is_template = false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_portal_tasks(uuid) TO anon;

-- 6. Update toggle_portal_task to optionally log a metric value on completion
CREATE OR REPLACE FUNCTION public.toggle_portal_task(
  p_client_id    uuid,
  p_task_id      uuid,
  p_metric_value numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_metric_def_id uuid;
  v_org_id        uuid;
  v_now_completed boolean;
BEGIN
  SELECT metric_definition_id, org_id
    INTO v_metric_def_id, v_org_id
    FROM tasks
   WHERE id = p_task_id AND client_id = p_client_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  UPDATE tasks
     SET completed = NOT completed
   WHERE id = p_task_id AND client_id = p_client_id
  RETURNING completed INTO v_now_completed;

  -- Log metric only when marking as complete (not when un-completing)
  IF v_now_completed AND p_metric_value IS NOT NULL AND v_metric_def_id IS NOT NULL THEN
    INSERT INTO custom_metric_values (org_id, client_id, definition_id, value, logged_at)
    VALUES (v_org_id, p_client_id, v_metric_def_id, p_metric_value, CURRENT_DATE)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_portal_task(uuid, uuid, numeric) TO anon;
