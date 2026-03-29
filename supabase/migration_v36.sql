-- ============================================================
-- FitProto Migration v36
-- Workout detail RPC: add video_url, equipment, progression data
-- and previous session data for progression-aware targets
-- ============================================================

CREATE OR REPLACE FUNCTION get_portal_workout_detail(
  p_client_workout_id uuid,
  p_client_id         uuid
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_workout_id uuid;
  v_result     json;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.client_workouts
    WHERE id = p_client_workout_id AND client_id = p_client_id
  ) THEN RETURN NULL; END IF;

  SELECT workout_id INTO v_workout_id
  FROM public.client_workouts WHERE id = p_client_workout_id;

  SELECT json_build_object(
    'client_workout_id', cw.id,
    'workout_name',      w.name,
    'workout_description', w.description,
    'exercises', (
      SELECT json_agg(
        json_build_object(
          'id',                we.id,
          'name',              we.exercise_name,
          'order_index',       we.order_index,
          'metric_type',       COALESCE(e.metric_type, 'reps_weight'),
          'muscle_group',      e.muscle_group,
          'equipment',         e.equipment,
          'video_url',         e.video_url,
          'instructions',      e.instructions,
          'progression_type',  COALESCE(we.progression_type, 'none'),
          'progression_value', we.progression_value,
          'sets', (
            SELECT json_agg(
              json_build_object(
                'set_number',       ws.set_number,
                'reps',             ws.reps,
                'weight',           ws.weight,
                'duration_seconds', ws.duration_seconds,
                'distance_meters',  ws.distance_meters,
                'rest_seconds',     ws.rest_seconds,
                -- Last session actuals for this client + exercise + set
                'last_reps', (
                  SELECT wsl.reps_achieved
                  FROM public.workout_set_logs wsl
                  JOIN public.workout_logs wl ON wl.id = wsl.workout_log_id
                  WHERE wsl.workout_exercise_id = we.id
                    AND wl.client_id = p_client_id
                    AND wsl.set_number = ws.set_number
                  ORDER BY wl.completed_at DESC LIMIT 1
                ),
                'last_weight', (
                  SELECT wsl.weight_used
                  FROM public.workout_set_logs wsl
                  JOIN public.workout_logs wl ON wl.id = wsl.workout_log_id
                  WHERE wsl.workout_exercise_id = we.id
                    AND wl.client_id = p_client_id
                    AND wsl.set_number = ws.set_number
                  ORDER BY wl.completed_at DESC LIMIT 1
                ),
                -- Weight target after applying progression to last session
                'suggested_weight', CASE
                  WHEN COALESCE(we.progression_type, 'none') = 'none'
                    OR we.progression_value IS NULL
                    THEN ws.weight
                  WHEN we.progression_type = 'linear' THEN (
                    SELECT ROUND((wsl.weight_used + we.progression_value)::numeric, 2)
                    FROM public.workout_set_logs wsl
                    JOIN public.workout_logs wl ON wl.id = wsl.workout_log_id
                    WHERE wsl.workout_exercise_id = we.id
                      AND wl.client_id = p_client_id
                      AND wsl.set_number = ws.set_number
                      AND wsl.weight_used IS NOT NULL
                    ORDER BY wl.completed_at DESC LIMIT 1
                  )
                  WHEN we.progression_type = 'percentage' THEN (
                    SELECT ROUND(
                      (wsl.weight_used * (1 + we.progression_value / 100.0))::numeric, 2
                    )
                    FROM public.workout_set_logs wsl
                    JOIN public.workout_logs wl ON wl.id = wsl.workout_log_id
                    WHERE wsl.workout_exercise_id = we.id
                      AND wl.client_id = p_client_id
                      AND wsl.set_number = ws.set_number
                      AND wsl.weight_used IS NOT NULL
                    ORDER BY wl.completed_at DESC LIMIT 1
                  )
                  ELSE ws.weight
                END
              ) ORDER BY ws.set_number
            )
            FROM public.workout_sets ws
            WHERE ws.workout_exercise_id = we.id
          )
        ) ORDER BY we.order_index
      )
      FROM public.workout_exercises we
      LEFT JOIN public.exercises e ON e.id = we.exercise_id
      WHERE we.workout_id = v_workout_id
    )
  ) INTO v_result
  FROM public.client_workouts cw
  JOIN public.workouts w ON w.id = cw.workout_id
  WHERE cw.id = p_client_workout_id;

  RETURN v_result;
END; $$;

GRANT EXECUTE ON FUNCTION get_portal_workout_detail TO anon;
