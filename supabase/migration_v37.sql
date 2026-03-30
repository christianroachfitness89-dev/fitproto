-- migration_v37: deduplicate exercises then add unique(org_id, name) for upsert support
--
-- For each duplicate group, keeps the exercise referenced by the most workouts
-- (falling back to oldest created_at). The surviving row retains all FK links
-- from workout_exercises so no workouts or programs are broken.

-- Step 1: Delete duplicate exercises, keeping the "best" one per (org_id, name)
DELETE FROM public.exercises
WHERE id IN (
  SELECT id FROM (
    SELECT
      e.id,
      ROW_NUMBER() OVER (
        PARTITION BY e.org_id, e.name
        ORDER BY
          -- prefer the row most referenced by workouts
          (SELECT COUNT(*) FROM public.workout_exercises we WHERE we.exercise_id = e.id) DESC,
          -- tiebreak: keep oldest (most likely the original)
          e.created_at ASC
      ) AS rn
    FROM public.exercises e
  ) ranked
  WHERE rn > 1
);

-- Step 2: Now that duplicates are gone, add the unique constraint
ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_org_id_name_key UNIQUE (org_id, name);
