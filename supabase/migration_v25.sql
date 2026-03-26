-- migration_v25: Custom metric definitions and values

-- Org-level metric definitions (the "types" of metrics coaches track)
CREATE TABLE IF NOT EXISTS metric_definitions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  unit        text NOT NULL DEFAULT '',
  emoji       text NOT NULL DEFAULT '📊',
  category    text NOT NULL DEFAULT 'custom'
              CHECK (category IN ('body_composition','performance','wellness','measurements','custom')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE metric_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members manage metric definitions"
  ON metric_definitions FOR ALL
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

-- Per-client custom metric values
CREATE TABLE IF NOT EXISTS custom_metric_values (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  definition_id   uuid NOT NULL REFERENCES metric_definitions(id) ON DELETE CASCADE,
  value           numeric NOT NULL,
  logged_at       date NOT NULL DEFAULT CURRENT_DATE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE custom_metric_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members manage custom metric values"
  ON custom_metric_values FOR ALL
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

-- Portal RPC: get custom metric values for a client (anon access)
CREATE OR REPLACE FUNCTION get_client_custom_metrics(p_client_id uuid)
RETURNS TABLE(
  definition_id uuid,
  name          text,
  unit          text,
  emoji         text,
  category      text,
  value         numeric,
  logged_at     date
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    cmv.definition_id,
    md.name,
    md.unit,
    md.emoji,
    md.category,
    cmv.value,
    cmv.logged_at
  FROM custom_metric_values cmv
  JOIN metric_definitions md ON md.id = cmv.definition_id
  WHERE cmv.client_id = p_client_id
  ORDER BY cmv.logged_at DESC, md.name
$$;

GRANT EXECUTE ON FUNCTION get_client_custom_metrics(uuid) TO anon;

-- Portal RPC: log a custom metric value (anon access for client self-logging)
CREATE OR REPLACE FUNCTION log_client_custom_metric(
  p_client_id     uuid,
  p_definition_id uuid,
  p_value         numeric,
  p_logged_at     date DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT org_id INTO v_org_id FROM clients WHERE id = p_client_id;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Client not found'; END IF;

  INSERT INTO custom_metric_values (org_id, client_id, definition_id, value, logged_at)
  VALUES (v_org_id, p_client_id, p_definition_id, p_value, p_logged_at)
  ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION log_client_custom_metric(uuid, uuid, numeric, date) TO anon;
