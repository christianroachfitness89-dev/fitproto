-- migration_v37: deduplicate exercises then add unique(org_id, name) for upsert support

-- Step 1: For each (org_id, name) group with duplicates, delete every row
-- except the first one (ordered by id). Using array subscript so it works
-- even when created_at values are identical (same-batch imports).
DELETE FROM public.exercises
WHERE id IN (
  SELECT unnest((array_agg(id ORDER BY id))[2:])
  FROM public.exercises
  GROUP BY org_id, name
  HAVING COUNT(*) > 1
);

-- Step 2: Confirm clean, then add constraint
ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_org_id_name_key UNIQUE (org_id, name);
