-- v35: Portal accountability RPC — lets the client portal read session log
--       tasks without coach auth (SECURITY DEFINER bypasses RLS)

CREATE OR REPLACE FUNCTION get_portal_accountability(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(

    -- Open sessions that have tasks (commitments awaiting review)
    'open_sessions', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',           sl.id,
          'session_date', sl.session_date,
          'workout_type', sl.workout_type,
          'tasks',        sl.tasks
        ) ORDER BY sl.session_date DESC, sl.session_time DESC NULLS LAST
      )
      FROM session_logs sl
      WHERE sl.client_id = p_client_id
        AND sl.status    = 'open'
        AND jsonb_array_length(sl.tasks) > 0
    ), '[]'::jsonb),

    -- Last 5 completed sessions (evidence trail)
    'recent_completed', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',           sl.id,
          'session_date', sl.session_date,
          'workout_type', sl.workout_type,
          'tasks',        sl.tasks,
          'reviewed_at',  sl.reviewed_at
        ) ORDER BY sl.reviewed_at DESC NULLS LAST
      )
      FROM (
        SELECT * FROM session_logs
        WHERE client_id = p_client_id
          AND status    = 'completed'
          AND jsonb_array_length(tasks) > 0
        ORDER BY reviewed_at DESC NULLS LAST
        LIMIT 5
      ) sl
    ), '[]'::jsonb)

  );
END;
$$;
