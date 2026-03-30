-- migration_v38: make seed_org_from_global_templates idempotent (upsert, not insert)
-- Also adds unique(name) on global_template_exercises so admin bulk uploads don't duplicate either.

-- Step 1: Deduplicate global_template_exercises by name (keep oldest)
DELETE FROM public.global_template_exercises
WHERE id IN (
  SELECT unnest((array_agg(id ORDER BY id))[2:])
  FROM public.global_template_exercises
  GROUP BY name
  HAVING COUNT(*) > 1
);

-- Step 2: Unique constraints on global template tables
ALTER TABLE public.global_template_exercises
  ADD CONSTRAINT global_template_exercises_name_key UNIQUE (name);

-- Step 2b: Unique constraint on metric_definitions(org_id, name) for the same reason
-- First deduplicate
DELETE FROM public.metric_definitions
WHERE id IN (
  SELECT unnest((array_agg(id ORDER BY id))[2:])
  FROM public.metric_definitions
  GROUP BY org_id, name
  HAVING COUNT(*) > 1
);
ALTER TABLE public.metric_definitions
  ADD CONSTRAINT metric_definitions_org_id_name_key UNIQUE (org_id, name);

-- Step 3: Replace seed_org_from_global_templates with an upsert version.
-- ON CONFLICT (org_id, name) DO UPDATE ensures re-seeding an org only updates
-- existing template exercises and inserts genuinely new ones — never duplicates.
CREATE OR REPLACE FUNCTION seed_org_from_global_templates(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Exercises: upsert on (org_id, name)
  INSERT INTO exercises (
    org_id, name, category, muscle_group, equipment, instructions,
    metric_type, difficulty, secondary_muscle, movement_pattern,
    body_region, mechanics, is_template
  )
  SELECT
    p_org_id, name, category, muscle_group, equipment, instructions,
    metric_type, difficulty, secondary_muscle, movement_pattern,
    body_region, mechanics, true
  FROM global_template_exercises
  ON CONFLICT (org_id, name) DO UPDATE SET
    category         = EXCLUDED.category,
    muscle_group     = EXCLUDED.muscle_group,
    equipment        = EXCLUDED.equipment,
    instructions     = EXCLUDED.instructions,
    metric_type      = EXCLUDED.metric_type,
    difficulty       = EXCLUDED.difficulty,
    secondary_muscle = EXCLUDED.secondary_muscle,
    movement_pattern = EXCLUDED.movement_pattern,
    body_region      = EXCLUDED.body_region,
    mechanics        = EXCLUDED.mechanics,
    is_template      = true;

  -- Metric definitions: upsert on (org_id, name)
  INSERT INTO metric_definitions (org_id, name, unit, emoji, category, is_template)
  SELECT p_org_id, name, unit, emoji, category, true
  FROM global_template_metric_definitions
  ON CONFLICT (org_id, name) DO UPDATE SET
    unit        = EXCLUDED.unit,
    emoji       = EXCLUDED.emoji,
    category    = EXCLUDED.category,
    is_template = true;
END;
$$;
