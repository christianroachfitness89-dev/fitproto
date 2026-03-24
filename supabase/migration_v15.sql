-- migration_v15: Community Forum & Education Hub
-- Tables: posts, reactions, comments, modules, lessons, progress
-- RLS policies for coach-side authenticated access
-- Security-definer RPCs for client portal (anon key)

-- ── Tables ────────────────────────────────────────────────────

CREATE TABLE community_posts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_type      text        NOT NULL DEFAULT 'coach',  -- 'coach' | 'client'
  author_client_id uuid        REFERENCES clients(id) ON DELETE SET NULL,
  content          text        NOT NULL,
  media_url        text,
  media_type       text        CHECK (media_type IN ('image','video','audio')),
  pinned           boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE community_reactions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           uuid        NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  reactor_type      text        NOT NULL,
  reactor_client_id uuid        REFERENCES clients(id) ON DELETE CASCADE,
  reactor_org_id    uuid        REFERENCES organizations(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_client_reaction UNIQUE(post_id, reactor_client_id),
  CONSTRAINT one_coach_reaction  UNIQUE(post_id, reactor_org_id)
);

CREATE TABLE community_comments (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id          uuid        NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_type      text        NOT NULL,
  author_client_id uuid        REFERENCES clients(id) ON DELETE SET NULL,
  author_org_id    uuid        REFERENCES organizations(id) ON DELETE SET NULL,
  content          text        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE community_modules (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text,
  cover_url   text,
  position    integer     NOT NULL DEFAULT 0,
  published   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE community_lessons (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id        uuid        NOT NULL REFERENCES community_modules(id) ON DELETE CASCADE,
  title            text        NOT NULL,
  description      text,
  content_type     text        NOT NULL CHECK (content_type IN ('video','audio','document','text')),
  content_url      text,
  body             text,
  drip_days        integer     NOT NULL DEFAULT 0,
  position         integer     NOT NULL DEFAULT 0,
  published        boolean     NOT NULL DEFAULT false,
  duration_minutes integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE community_lesson_progress (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id    uuid        NOT NULL REFERENCES community_lessons(id) ON DELETE CASCADE,
  client_id    uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  completed    boolean     NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, client_id)
);

-- ── Indexes ───────────────────────────────────────────────────

CREATE INDEX idx_community_posts_org ON community_posts(org_id, created_at DESC);
CREATE INDEX idx_community_reactions_post ON community_reactions(post_id);
CREATE INDEX idx_community_comments_post ON community_comments(post_id, created_at ASC);
CREATE INDEX idx_community_modules_org ON community_modules(org_id, position ASC);
CREATE INDEX idx_community_lessons_module ON community_lessons(module_id, position ASC);
CREATE INDEX idx_community_progress_client ON community_lesson_progress(client_id);

-- ── RLS policies (coach authenticated access) ─────────────────

ALTER TABLE community_posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_modules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_lessons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_lesson_progress ENABLE ROW LEVEL SECURITY;

-- Posts
CREATE POLICY "coach_community_posts" ON community_posts
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Reactions
CREATE POLICY "coach_community_reactions" ON community_reactions
  USING (post_id IN (
    SELECT id FROM community_posts
    WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  ));

-- Comments
CREATE POLICY "coach_community_comments" ON community_comments
  USING (post_id IN (
    SELECT id FROM community_posts
    WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  ));

-- Modules
CREATE POLICY "coach_community_modules" ON community_modules
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Lessons
CREATE POLICY "coach_community_lessons" ON community_lessons
  USING (module_id IN (
    SELECT id FROM community_modules
    WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  ));

-- Progress
CREATE POLICY "coach_community_progress" ON community_lesson_progress
  USING (client_id IN (
    SELECT id FROM clients
    WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  ));

-- ── Portal RPCs (anon key, security definer) ──────────────────

-- 1. get_community_feed ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_community_feed(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_org_id uuid; BEGIN
  SELECT org_id INTO v_org_id FROM clients WHERE id = p_client_id;
  IF v_org_id IS NULL THEN RETURN '[]'::jsonb; END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(row_data ORDER BY (row_data->>'pinned')::boolean DESC, (row_data->>'created_at') DESC), '[]'::jsonb)
    FROM (
      SELECT jsonb_build_object(
        'id',             p.id,
        'content',        p.content,
        'media_url',      p.media_url,
        'media_type',     p.media_type,
        'pinned',         p.pinned,
        'created_at',     p.created_at,
        'author_type',    p.author_type,
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
    ) sub
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.get_community_feed(uuid) TO anon;

-- 2. toggle_community_reaction ──────────────────────────────
CREATE OR REPLACE FUNCTION public.toggle_community_reaction(p_client_id uuid, p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_org_id uuid; v_exists boolean; BEGIN
  SELECT org_id INTO v_org_id FROM clients WHERE id = p_client_id;
  IF NOT EXISTS (SELECT 1 FROM community_posts WHERE id = p_post_id AND org_id = v_org_id) THEN
    RAISE EXCEPTION 'Post not found';
  END IF;
  SELECT EXISTS(SELECT 1 FROM community_reactions WHERE post_id = p_post_id AND reactor_client_id = p_client_id) INTO v_exists;
  IF v_exists THEN
    DELETE FROM community_reactions WHERE post_id = p_post_id AND reactor_client_id = p_client_id;
    RETURN jsonb_build_object('reacted', false);
  ELSE
    INSERT INTO community_reactions(post_id, reactor_type, reactor_client_id)
    VALUES (p_post_id, 'client', p_client_id);
    RETURN jsonb_build_object('reacted', true);
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.toggle_community_reaction(uuid, uuid) TO anon;

-- 3. add_community_comment ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_community_comment(
  p_client_id uuid, p_post_id uuid, p_content text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_org_id uuid; v_name text; v_id uuid; v_ts timestamptz; BEGIN
  SELECT org_id, name INTO v_org_id, v_name FROM clients WHERE id = p_client_id;
  IF NOT EXISTS (SELECT 1 FROM community_posts WHERE id = p_post_id AND org_id = v_org_id) THEN
    RAISE EXCEPTION 'Post not found';
  END IF;
  v_ts := now();
  INSERT INTO community_comments(post_id, author_type, author_client_id, content, created_at)
  VALUES (p_post_id, 'client', p_client_id, p_content, v_ts)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object(
    'id', v_id, 'content', p_content,
    'author_name', v_name, 'author_type', 'client', 'created_at', v_ts
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.add_community_comment(uuid, uuid, text) TO anon;

-- 4. get_community_comments ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_community_comments(p_client_id uuid, p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_org_id uuid; BEGIN
  SELECT org_id INTO v_org_id FROM clients WHERE id = p_client_id;
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id',          c.id,
        'content',     c.content,
        'author_type', c.author_type,
        'author_name', CASE
                         WHEN c.author_type = 'client' THEN (SELECT name FROM clients WHERE id = c.author_client_id)
                         ELSE (SELECT full_name FROM profiles WHERE org_id = v_org_id ORDER BY created_at ASC LIMIT 1)
                       END,
        'created_at',  c.created_at
      )
      ORDER BY c.created_at ASC
    ), '[]'::jsonb)
    FROM community_comments c
    WHERE c.post_id = p_post_id
      AND c.post_id IN (SELECT id FROM community_posts WHERE org_id = v_org_id)
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.get_community_comments(uuid, uuid) TO anon;

-- 5. get_community_modules ──────────────────────────────────
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
    WHERE m.org_id = v_org_id AND m.published = true
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.get_community_modules(uuid) TO anon;

-- 6. complete_community_lesson (toggle) ─────────────────────
CREATE OR REPLACE FUNCTION public.complete_community_lesson(p_client_id uuid, p_lesson_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_org_id uuid; BEGIN
  SELECT org_id INTO v_org_id FROM clients WHERE id = p_client_id;
  IF NOT EXISTS (
    SELECT 1 FROM community_lessons l
    JOIN community_modules m ON m.id = l.module_id
    WHERE l.id = p_lesson_id AND m.org_id = v_org_id AND l.published = true
  ) THEN
    RAISE EXCEPTION 'Lesson not found';
  END IF;
  INSERT INTO community_lesson_progress(lesson_id, client_id, completed, completed_at)
  VALUES (p_lesson_id, p_client_id, true, now())
  ON CONFLICT(lesson_id, client_id) DO UPDATE
    SET completed     = NOT community_lesson_progress.completed,
        completed_at  = CASE WHEN NOT community_lesson_progress.completed THEN now() ELSE NULL END;
END; $$;
GRANT EXECUTE ON FUNCTION public.complete_community_lesson(uuid, uuid) TO anon;
