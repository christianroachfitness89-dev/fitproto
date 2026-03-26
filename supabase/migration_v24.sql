-- migration_v24: Calendar habit completions for client portal

-- Returns active habit metadata for a client (used by calendar view)
CREATE OR REPLACE FUNCTION get_client_habits_metadata(p_client_id uuid)
RETURNS TABLE(id uuid, name text, emoji text, frequency text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, emoji, frequency, created_at
  FROM habits
  WHERE client_id = p_client_id
    AND is_template = false
    AND active = true
  ORDER BY created_at
$$;

GRANT EXECUTE ON FUNCTION get_client_habits_metadata(uuid) TO anon;

-- Returns habit completion dates for a client within a date range (used by calendar)
CREATE OR REPLACE FUNCTION get_habit_completions_range(
  p_client_id uuid,
  p_start_date date,
  p_end_date   date
)
RETURNS TABLE(habit_id uuid, completed_date date)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT hc.habit_id, hc.completed_date
  FROM habit_completions hc
  WHERE hc.client_id = p_client_id
    AND hc.completed_date BETWEEN p_start_date AND p_end_date
$$;

GRANT EXECUTE ON FUNCTION get_habit_completions_range(uuid, date, date) TO anon;
