-- ─── Admin role ───────────────────────────────────────────────
-- Extend profile role check to include 'admin'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'coach', 'admin'));

-- Admin profiles have no org (org_id is already nullable in schema)

-- ─── Global template tables ───────────────────────────────────

CREATE TABLE IF NOT EXISTS global_template_exercises (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  category         text,
  muscle_group     text,
  equipment        text,
  instructions     text,
  metric_type      text NOT NULL DEFAULT 'reps_weight'
                   CHECK (metric_type IN ('reps_weight','reps','time','distance')),
  difficulty       text,
  secondary_muscle text,
  movement_pattern text,
  body_region      text,
  mechanics        text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS global_template_metric_definitions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  unit       text NOT NULL DEFAULT '',
  emoji      text NOT NULL DEFAULT '📊',
  category   text NOT NULL DEFAULT 'custom'
             CHECK (category IN ('body_composition','performance','wellness','measurements','custom')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS global_template_habits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  emoji       text NOT NULL DEFAULT '✅',
  frequency   text NOT NULL DEFAULT 'daily'
              CHECK (frequency IN ('daily','weekdays','weekends','weekly')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS for global template tables ──────────────────────────
ALTER TABLE global_template_exercises          ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_template_metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_template_habits             ENABLE ROW LEVEL SECURITY;

-- Admin can manage all
CREATE POLICY "admin manage template exercises"
  ON global_template_exercises FOR ALL
  USING  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin manage template metrics"
  ON global_template_metric_definitions FOR ALL
  USING  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin manage template habits"
  ON global_template_habits FOR ALL
  USING  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ─── is_template flag on org tables ──────────────────────────
-- Marks rows that were seeded from global templates (locked for coaches)
ALTER TABLE exercises          ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false;
ALTER TABLE metric_definitions ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false;

-- ─── Seed function ────────────────────────────────────────────
-- Called when a new org is created; copies global templates into the org
CREATE OR REPLACE FUNCTION seed_org_from_global_templates(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Exercises
  INSERT INTO exercises (
    org_id, name, category, muscle_group, equipment, instructions,
    metric_type, difficulty, secondary_muscle, movement_pattern,
    body_region, mechanics, is_template
  )
  SELECT
    p_org_id, name, category, muscle_group, equipment, instructions,
    metric_type, difficulty, secondary_muscle, movement_pattern,
    body_region, mechanics, true
  FROM global_template_exercises;

  -- Metric definitions
  INSERT INTO metric_definitions (org_id, name, unit, emoji, category, is_template)
  SELECT p_org_id, name, unit, emoji, category, true
  FROM global_template_metric_definitions;
END;
$$;

GRANT EXECUTE ON FUNCTION seed_org_from_global_templates(uuid) TO authenticated;

-- ─── Trigger: auto-seed new orgs ─────────────────────────────
CREATE OR REPLACE FUNCTION trigger_seed_new_org()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM seed_org_from_global_templates(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_org_created_seed_templates ON organizations;
CREATE TRIGGER on_org_created_seed_templates
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION trigger_seed_new_org();

-- ─── Admin RPC: list all orgs (for admin panel) ──────────────
CREATE OR REPLACE FUNCTION admin_list_orgs()
RETURNS TABLE (id uuid, name text, owner_id uuid, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, owner_id, created_at FROM organizations ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION admin_list_orgs() TO authenticated;

-- ─── Admin RPC: seed specific org (for existing orgs) ────────
CREATE OR REPLACE FUNCTION admin_seed_org(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  PERFORM seed_org_from_global_templates(p_org_id);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_seed_org(uuid) TO authenticated;
