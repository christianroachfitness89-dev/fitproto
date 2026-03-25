-- migration_v21.sql
-- Strict community isolation for all content RPCs.
-- Rule: NULL  = General only  (community_id IS NULL)
--       UUID  = that community only  (community_id = X, membership enforced for clients)

-- ── 1. get_community_feed_coach ──────────────────────────────────
CREATE OR REPLACE FUNCTION get_community_feed_coach(
  p_org_id       uuid,
  p_section_id   uuid  DEFAULT NULL,
  p_community_id uuid  DEFAULT NULL,
  p_limit        int   DEFAULT 20,
  p_offset       int   DEFAULT 0
)
RETURNS TABLE (
  id                uuid,
  content           text,
  media_url         text,
  media_type        text,
  pinned            boolean,
  created_at        timestamptz,
  author_type       text,
  author_client_id  uuid,
  section_id        uuid,
  community_id      uuid,
  reaction_count    bigint,
  comment_count     bigint,
  coach_reacted     boolean,
  author_name       text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.content, p.media_url, p.media_type::text, p.pinned,
    p.created_at, p.author_type, p.author_client_id, p.section_id, p.community_id,
    (SELECT COUNT(*) FROM community_reactions r WHERE r.post_id = p.id)::bigint,
    (SELECT COUNT(*) FROM community_comments  c WHERE c.post_id = p.id)::bigint,
    EXISTS (SELECT 1 FROM community_reactions r2
            WHERE r2.post_id = p.id AND r2.reactor_type = 'coach' AND r2.reactor_org_id = p_org_id),
    CASE WHEN p.author_type = 'coach' THEN 'Coach'
         ELSE COALESCE((SELECT cl.name FROM clients cl WHERE cl.id = p.author_client_id), 'Client')
    END
  FROM community_posts p
  WHERE p.org_id = p_org_id
    AND (p_section_id IS NULL OR p.section_id = p_section_id)
    AND (
      (p_community_id IS NULL     AND p.community_id IS NULL)
      OR
      (p_community_id IS NOT NULL AND p.community_id = p_community_id)
    )
  ORDER BY p.pinned DESC, p.created_at DESC
  LIMIT  p_limit
  OFFSET p_offset
$$;

GRANT EXECUTE ON FUNCTION get_community_feed_coach TO authenticated;

-- ── 2. get_community_feed (client) ───────────────────────────────
CREATE OR REPLACE FUNCTION public.get_community_feed(
  p_client_id    uuid,
  p_section_id   uuid DEFAULT NULL,
  p_community_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_org_id uuid; BEGIN
  SELECT org_id INTO v_org_id FROM clients WHERE id = p_client_id;
  IF v_org_id IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(row_data ORDER BY
      (row_data->>'pinned')::boolean DESC,
      (row_data->>'created_at') DESC
    ), '[]'::jsonb)
    FROM (
      SELECT jsonb_build_object(
        'id',             p.id,
        'content',        p.content,
        'media_url',      p.media_url,
        'media_type',     p.media_type,
        'pinned',         p.pinned,
        'created_at',     p.created_at,
        'author_type',    p.author_type,
        'section_id',     p.section_id,
        'community_id',   p.community_id,
        'author_name',    CASE
                            WHEN p.author_type = 'client'
                            THEN (SELECT name FROM clients WHERE id = p.author_client_id)
                            ELSE (SELECT full_name FROM profiles WHERE org_id = p.org_id ORDER BY created_at ASC LIMIT 1)
                          END,
        'reaction_count', (SELECT COUNT(*) FROM community_reactions WHERE post_id = p.id),
        'client_reacted', EXISTS(SELECT 1 FROM community_reactions WHERE post_id = p.id AND reactor_client_id = p_client_id),
        'comment_count',  (SELECT COUNT(*) FROM community_comments WHERE post_id = p.id)
      ) AS row_data
      FROM community_posts p
      WHERE p.org_id = v_org_id
        AND (p_section_id IS NULL OR p.section_id = p_section_id)
        AND (
          -- General view: only general posts
          (p_community_id IS NULL AND p.community_id IS NULL)
          OR
          -- Community view: only that community's posts + membership check
          (p_community_id IS NOT NULL
           AND p.community_id = p_community_id
           AND EXISTS (
             SELECT 1 FROM community_members cm
             WHERE cm.community_id = p_community_id AND cm.client_id = p_client_id
           ))
        )
    ) sub
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.get_community_feed(uuid, uuid, uuid) TO anon;

-- ── 3. get_community_sections (client) ───────────────────────────
CREATE OR REPLACE FUNCTION public.get_community_sections(
  p_client_id    uuid,
  p_community_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_org_id uuid; BEGIN
  SELECT org_id INTO v_org_id FROM clients WHERE id = p_client_id;
  IF v_org_id IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object('id', s.id, 'name', s.name, 'emoji', s.emoji, 'position', s.position)
      ORDER BY s.position ASC, s.created_at ASC
    ), '[]'::jsonb)
    FROM community_sections s
    WHERE s.org_id = v_org_id
      AND (
        (p_community_id IS NULL     AND s.community_id IS NULL)
        OR
        (p_community_id IS NOT NULL AND s.community_id = p_community_id)
      )
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.get_community_sections(uuid, uuid) TO anon;

-- ── 4. get_community_modules (client) ────────────────────────────
CREATE OR REPLACE FUNCTION public.get_community_modules(
  p_client_id    uuid,
  p_community_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_org_id uuid; v_joined_at timestamptz; BEGIN
  SELECT org_id, created_at INTO v_org_id, v_joined_at FROM clients WHERE id = p_client_id;
  IF v_org_id IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id',           m.id,
        'title',        m.title,
        'description',  m.description,
        'cover_url',    m.cover_url,
        'position',     m.position,
        'community_id', m.community_id,
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
                 WHERE lp.lesson_id = l.id AND lp.client_id = p_client_id), false)
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
    WHERE m.org_id    = v_org_id
      AND m.published = true
      AND (
        m.access_type = 'all'
        OR EXISTS (SELECT 1 FROM community_module_enrollments e WHERE e.module_id = m.id AND e.client_id = p_client_id)
      )
      AND (
        -- General view: only unassigned modules
        (p_community_id IS NULL AND m.community_id IS NULL)
        OR
        -- Community view: only that community's modules + membership check
        (p_community_id IS NOT NULL
         AND m.community_id = p_community_id
         AND EXISTS (
           SELECT 1 FROM community_members cm
           WHERE cm.community_id = p_community_id AND cm.client_id = p_client_id
         ))
      )
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.get_community_modules(uuid, uuid) TO anon;
