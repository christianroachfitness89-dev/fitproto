-- ── Migration v22: Habits + Habit Completions ──────────────────

-- Habits: recurring behaviours assigned to a client by a coach
CREATE TABLE IF NOT EXISTS habits (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id    uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  description  text,
  emoji        text        NOT NULL DEFAULT '✅',
  frequency    text        NOT NULL DEFAULT 'daily'
                           CHECK (frequency IN ('daily','weekdays','weekends','weekly')),
  active       boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Habit completions: one row per habit per day when completed
CREATE TABLE IF NOT EXISTS habit_completions (
  id             uuid   PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id       uuid   NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  client_id      uuid   NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  completed_date date   NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, completed_date)
);

-- RLS
ALTER TABLE habits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "habits_coach_all"              ON habits;
DROP POLICY IF EXISTS "habit_completions_coach_all"   ON habit_completions;

CREATE POLICY "habits_coach_all" ON habits
  USING  (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "habit_completions_coach_all" ON habit_completions
  USING  (habit_id IN (SELECT id FROM habits WHERE org_id = get_user_org_id()))
  WITH CHECK (habit_id IN (SELECT id FROM habits WHERE org_id = get_user_org_id()));

-- ── get_client_habits ───────────────────────────────────────────
-- Returns all active habits for a client with today's completion status + 7-day streak
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
        'id',              h.id,
        'name',            h.name,
        'description',     h.description,
        'emoji',           h.emoji,
        'frequency',       h.frequency,
        'active',          h.active,
        'created_at',      h.created_at,
        'completed_today', EXISTS(
          SELECT 1 FROM habit_completions hc
          WHERE hc.habit_id = h.id AND hc.completed_date = p_date
        ),
        'streak', (
          -- Consecutive days completed up to and including p_date
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
  WHERE h.client_id = p_client_id
    AND h.active = true
$$;

GRANT EXECUTE ON FUNCTION get_client_habits(uuid, date) TO anon;

-- ── toggle_habit_completion ─────────────────────────────────────
-- Toggles a completion for a given habit + date; returns new completed state
CREATE OR REPLACE FUNCTION toggle_habit_completion(
  p_client_id uuid,
  p_habit_id  uuid,
  p_date      date DEFAULT CURRENT_DATE
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  already boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM habits WHERE id = p_habit_id AND client_id = p_client_id) THEN
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
    RETURN true;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION toggle_habit_completion(uuid, uuid, date) TO anon;
