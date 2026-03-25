-- migration_v19.sql
-- Adds get_community_feed_coach RPC to replace N+1 queries on the coach feed.
-- Returns posts with reaction_count, comment_count, coach_reacted, and author_name
-- all in a single query. Supports section filtering and LIMIT/OFFSET pagination.

CREATE OR REPLACE FUNCTION get_community_feed_coach(
  p_org_id      uuid,
  p_section_id  uuid  DEFAULT NULL,
  p_limit       int   DEFAULT 20,
  p_offset      int   DEFAULT 0
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
    (SELECT COUNT(*) FROM community_reactions r  WHERE r.post_id = p.id)::bigint              AS reaction_count,
    (SELECT COUNT(*) FROM community_comments c   WHERE c.post_id = p.id)::bigint              AS comment_count,
    EXISTS (
      SELECT 1 FROM community_reactions r2
      WHERE  r2.post_id       = p.id
        AND  r2.reactor_type  = 'coach'
        AND  r2.reactor_org_id = p_org_id
    )                                                                                           AS coach_reacted,
    CASE
      WHEN p.author_type = 'coach' THEN 'Coach'
      ELSE COALESCE(
        (SELECT cl.name FROM clients cl WHERE cl.id = p.author_client_id),
        'Client'
      )
    END                                                                                         AS author_name
  FROM  community_posts p
  WHERE p.org_id      = p_org_id
    AND (p_section_id IS NULL OR p.section_id = p_section_id)
  ORDER BY p.pinned DESC, p.created_at DESC
  LIMIT  p_limit
  OFFSET p_offset
$$;

GRANT EXECUTE ON FUNCTION get_community_feed_coach TO authenticated;
