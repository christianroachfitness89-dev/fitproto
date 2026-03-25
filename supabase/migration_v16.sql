-- migration_v16: Course Enrollment & Access Control
-- Adds per-module access type (all / enrolled-only) and an enrollments join table
-- Updates get_community_modules RPC to respect access control

-- ── Schema changes ─────────────────────────────────────────────

ALTER TABLE community_modules
  ADD COLUMN IF NOT EXISTS access_type        text    NOT NULL DEFAULT 'all'
    CHECK (access_type IN ('all', 'enrolled')),
  ADD COLUMN IF NOT EXISTS auto_enroll_on_join boolean NOT NULL DEFAULT false;

-- ── Enrollments table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS community_module_enrollments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id   uuid        NOT NULL REFERENCES community_modules(id) ON DELETE CASCADE,
  client_id   uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(module_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_community_enrollments_module
  ON community_module_enrollments(module_id);
CREATE INDEX IF NOT EXISTS idx_community_enrollments_client
  ON community_module_enrollments(client_id);

ALTER TABLE community_module_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_community_enrollments" ON community_module_enrollments
  USING (module_id IN (
    SELECT id FROM community_modules
    WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  ));

-- ── Updated RPC: get_community_modules ─────────────────────────
-- Respects access_type: 'all' = visible to every client,
-- 'enrolled' = only visible if the client has an enrollment row

CREATE OR REPLACE FUNCTION public.get_community_modules(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_org_id uuid; v_joined_at timestamptz; BEGIN
  SELECT org_id, created_at INTO v_org_id, v_joined_at FROM clients WHERE id = p_client_id;
  IF v_org_id IS NULL THEN RETURN '[]'::jsonb; END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id',          m.id,
        'title',       m.title,
        'description', m.description,
        'cover_url',   m.cover_url,
        'position',    m.position,
        'lessons', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'id',               l.id,
              'title',            l.title,
              'description',      l.description,
              'content_type',     l.content_type,
              'content_url',      l.content_url,
              'body',             l.body,
              'duration_minutes', l.duration_minutes,
              'drip_days',        l.drip_days,
              'locked',           (EXTRACT(EPOCH FROM (now() - v_joined_at))/86400 < l.drip_days),
              'completed',        COALESCE(
                (SELECT lp.completed FROM community_lesson_progress lp
                 WHERE lp.lesson_id = l.id AND lp.client_id = p_client_id), false
              )
            )
            ORDER BY l.position ASC, l.created_at ASC
          ), '[]'::jsonb)
          FROM community_lessons l
          WHERE l.module_id = m.id AND l.published = true
        )
      )
      ORDER BY m.position ASC, m.created_at ASC
    ), '[]'::jsonb)
    FROM community_modules m
    WHERE m.org_id     = v_org_id
      AND m.published  = true
      AND (
        m.access_type = 'all'
        OR EXISTS (
          SELECT 1 FROM community_module_enrollments e
          WHERE e.module_id = m.id AND e.client_id = p_client_id
        )
      )
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.get_community_modules(uuid) TO anon;
