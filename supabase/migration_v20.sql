-- migration_v20.sql
-- Multiple communities per coach org.
-- Each org can have N named communities (e.g. "8 Week Challenge", "Regular Clients").
-- Posts, sections, and modules can be assigned to a specific community.
-- Items with community_id IS NULL are "general" and visible in all communities.

-- ── 1. communities table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communities (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  description text,
  emoji       text        NOT NULL DEFAULT '🏘️',
  position    int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 2. community_members (clients assigned to a community) ───────
CREATE TABLE IF NOT EXISTS community_members (
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  client_id    uuid NOT NULL REFERENCES clients(id)     ON DELETE CASCADE,
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, client_id)
);

-- ── 3. Add community_id FK to existing content tables ───────────
ALTER TABLE community_posts    ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES communities(id) ON DELETE SET NULL;
ALTER TABLE community_sections ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES communities(id) ON DELETE SET NULL;
ALTER TABLE community_modules  ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES communities(id) ON DELETE SET NULL;

-- ── 4. Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_communities_org        ON communities(org_id);
CREATE INDEX IF NOT EXISTS idx_comm_members_comm      ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_comm_members_client    ON community_members(client_id);
CREATE INDEX IF NOT EXISTS idx_posts_community_id     ON community_posts(community_id);
CREATE INDEX IF NOT EXISTS idx_sections_community_id  ON community_sections(community_id);
CREATE INDEX IF NOT EXISTS idx_modules_community_id   ON community_modules(community_id);

-- ── 5. RLS ───────────────────────────────────────────────────────
ALTER TABLE communities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "communities_coach_all"       ON communities;
DROP POLICY IF EXISTS "community_members_coach_all" ON community_members;

CREATE POLICY "communities_coach_all" ON communities
  FOR ALL USING  (org_id = auth.uid())
  WITH CHECK     (org_id = auth.uid());

CREATE POLICY "community_members_coach_all" ON community_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM communities c WHERE c.id = community_id AND c.org_id = auth.uid())
  );

-- ── 6. Updated get_community_feed_coach (adds p_community_id) ───
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
    p.id,
    p.content,
    p.media_url,
    p.media_type::text,
    p.pinned,
    p.created_at,
    p.author_type,
    p.author_client_id,
    p.section_id,
    p.community_id,
    (SELECT COUNT(*) FROM community_reactions r  WHERE r.post_id = p.id)::bigint  AS reaction_count,
    (SELECT COUNT(*) FROM community_comments  c  WHERE c.post_id = p.id)::bigint  AS comment_count,
    EXISTS (
      SELECT 1 FROM community_reactions r2
      WHERE  r2.post_id        = p.id
        AND  r2.reactor_type   = 'coach'
        AND  r2.reactor_org_id = p_org_id
    )                                                                               AS coach_reacted,
    CASE
      WHEN p.author_type = 'coach' THEN 'Coach'
      ELSE COALESCE((SELECT cl.name FROM clients cl WHERE cl.id = p.author_client_id), 'Client')
    END                                                                             AS author_name
  FROM  community_posts p
  WHERE p.org_id      = p_org_id
    AND (p_section_id   IS NULL OR p.section_id   = p_section_id)
    AND (p_community_id IS NULL OR p.community_id IS NULL OR p.community_id = p_community_id)
  ORDER BY p.pinned DESC, p.created_at DESC
  LIMIT  p_limit
  OFFSET p_offset
$$;

GRANT EXECUTE ON FUNCTION get_community_feed_coach TO authenticated;

-- ── 7. Updated get_community_feed (adds p_community_id, checks membership) ──
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
        AND (p_section_id   IS NULL OR p.section_id   = p_section_id)
        AND (
          p_community_id IS NULL                -- no filter = show all
          OR p.community_id IS NULL              -- general posts visible everywhere
          OR (
            p.community_id = p_community_id
            AND EXISTS (
              SELECT 1 FROM community_members cm
              WHERE cm.community_id = p_community_id AND cm.client_id = p_client_id
            )
          )
        )
    ) sub
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.get_community_feed(uuid, uuid, uuid) TO anon;

-- ── 8. Updated get_community_sections (adds p_community_id) ─────
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
      AND (p_community_id IS NULL OR s.community_id IS NULL OR s.community_id = p_community_id)
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.get_community_sections(uuid, uuid) TO anon;

-- ── 9. Updated create_community_post (adds p_community_id) ──────
CREATE OR REPLACE FUNCTION public.create_community_post(
  p_client_id    uuid,
  p_content      text,
  p_section_id   uuid DEFAULT NULL,
  p_community_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id  uuid;
  v_name    text;
  v_post_id uuid;
  v_ts      timestamptz;
BEGIN
  SELECT org_id, name INTO v_org_id, v_name FROM clients WHERE id = p_client_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Client not found'; END IF;

  -- Validate section belongs to the same org
  IF p_section_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM community_sections WHERE id = p_section_id AND org_id = v_org_id) THEN
      RAISE EXCEPTION 'Section not found';
    END IF;
  END IF;

  -- Validate client is a member of the community (if specified)
  IF p_community_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM community_members WHERE community_id = p_community_id AND client_id = p_client_id) THEN
      RAISE EXCEPTION 'Not a member of this community';
    END IF;
  END IF;

  v_ts := now();
  INSERT INTO community_posts(org_id, author_type, author_client_id, content, section_id, community_id, created_at)
  VALUES (v_org_id, 'client', p_client_id, p_content, p_section_id, p_community_id, v_ts)
  RETURNING id INTO v_post_id;

  RETURN jsonb_build_object(
    'id',             v_post_id,
    'content',        p_content,
    'author_type',    'client',
    'author_name',    v_name,
    'section_id',     p_section_id,
    'community_id',   p_community_id,
    'pinned',         false,
    'created_at',     v_ts,
    'reaction_count', 0,
    'client_reacted', false,
    'comment_count',  0
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.create_community_post(uuid, text, uuid, uuid) TO anon;

-- ── 10. Updated get_community_modules (adds p_community_id) ─────
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
        'id',          m.id,
        'title',       m.title,
        'description', m.description,
        'cover_url',   m.cover_url,
        'position',    m.position,
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
    WHERE m.org_id    = v_org_id
      AND m.published = true
      AND (
        m.access_type = 'all'
        OR EXISTS (
          SELECT 1 FROM community_module_enrollments e
          WHERE e.module_id = m.id AND e.client_id = p_client_id
        )
      )
      AND (
        p_community_id IS NULL                -- no filter = show all accessible modules
        OR m.community_id IS NULL             -- general modules visible in all communities
        OR (
          m.community_id = p_community_id
          AND EXISTS (
            SELECT 1 FROM community_members cm
            WHERE cm.community_id = p_community_id AND cm.client_id = p_client_id
          )
        )
      )
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.get_community_modules(uuid, uuid) TO anon;

-- ── 11. New get_client_communities RPC ───────────────────────────
CREATE OR REPLACE FUNCTION public.get_client_communities(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_org_id uuid; BEGIN
  SELECT org_id INTO v_org_id FROM clients WHERE id = p_client_id;
  IF v_org_id IS NULL THEN RETURN '[]'::jsonb; END IF;
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id',          c.id,
        'name',        c.name,
        'emoji',       c.emoji,
        'description', c.description
      )
      ORDER BY c.position ASC, c.created_at ASC
    ), '[]'::jsonb)
    FROM communities c
    JOIN community_members cm ON cm.community_id = c.id
    WHERE cm.client_id = p_client_id
      AND c.org_id     = v_org_id
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.get_client_communities(uuid) TO anon;
