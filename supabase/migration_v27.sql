-- nutrition_plans: one row per client, upsert on client_id
CREATE TABLE IF NOT EXISTS nutrition_plans (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id        uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  mfp_username     text,
  calories_target  integer,
  protein_g        integer,
  carbs_g          integer,
  fat_g            integer,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE nutrition_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members manage nutrition plans"
  ON nutrition_plans FOR ALL
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

-- Portal RPC: public read of a client's nutrition plan
CREATE OR REPLACE FUNCTION get_portal_nutrition(p_client_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_build_object(
      'mfp_username',      np.mfp_username,
      'calories_target',   np.calories_target,
      'protein_g',         np.protein_g,
      'carbs_g',           np.carbs_g,
      'fat_g',             np.fat_g,
      'notes',             np.notes
    ),
    '{}'::jsonb
  )
  FROM nutrition_plans np
  WHERE np.client_id = p_client_id
$$;

GRANT EXECUTE ON FUNCTION get_portal_nutrition(uuid) TO anon;
