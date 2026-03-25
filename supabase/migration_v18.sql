-- migration_v18: Community feed sections + client posting
-- Adds community_sections table, section_id on posts, and RPCs for
-- client posting and fetching sections.

-- ── Sections table ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS community_sections (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  emoji      text        NOT NULL DEFAULT '💬',
  position   integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_sections_org
  ON community_sections(org_id, position ASC);

ALTER TABLE community_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_community_sections" ON community_sections
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- ── Add section_id to posts ────────────────────────────────────

ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS section_id uuid
    REFERENCES community_sections(id) ON DELETE SET NULL;

-- ── Updated get_community_feed: optional section filter ────────

CREATE OR REPLACE FUNCTION public.get_community_feed(
  p_client_id uuid,
  p_section_id uuid DEFAULT NULL
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
    ) sub
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.get_community_feed(uuid, uuid) TO anon;

-- ── get_community_sections ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_community_sections(p_client_id uuid)
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
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.get_community_sections(uuid) TO anon;

-- ── create_community_post (client posting) ─────────────────────

CREATE OR REPLACE FUNCTION public.create_community_post(
  p_client_id  uuid,
  p_content    text,
  p_section_id uuid DEFAULT NULL
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
  -- validate section belongs to the same org
  IF p_section_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM community_sections WHERE id = p_section_id AND org_id = v_org_id) THEN
      RAISE EXCEPTION 'Section not found';
    END IF;
  END IF;
  v_ts := now();
  INSERT INTO community_posts(org_id, author_type, author_client_id, content, section_id, created_at)
  VALUES (v_org_id, 'client', p_client_id, p_content, p_section_id, v_ts)
  RETURNING id INTO v_post_id;
  RETURN jsonb_build_object(
    'id',             v_post_id,
    'content',        p_content,
    'author_type',    'client',
    'author_name',    v_name,
    'section_id',     p_section_id,
    'pinned',         false,
    'created_at',     v_ts,
    'reaction_count', 0,
    'client_reacted', false,
    'comment_count',  0
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.create_community_post(uuid, text, uuid) TO anon;
