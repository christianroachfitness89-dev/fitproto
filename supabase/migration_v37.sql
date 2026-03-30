-- migration_v37: deduplicate exercises then add unique(org_id, name) for upsert support

-- Step 1: Delete duplicates using a self-join.
-- For every pair sharing (org_id, name), keep the row with the earlier created_at
-- (or smaller id as tiebreaker). This is simpler and guaranteed to work.
DELETE FROM public.exercises a
USING public.exercises b
WHERE a.org_id = b.org_id
  AND a.name = b.name
  AND (
    a.created_at > b.created_at
    OR (a.created_at = b.created_at AND a.id > b.id)
  );

-- Step 2: Confirm no duplicates remain, then add constraint
ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_org_id_name_key UNIQUE (org_id, name);
