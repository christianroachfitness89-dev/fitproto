-- migration_v37: unique constraint on exercises(org_id, name) to support upsert imports
-- This allows bulk CSV uploads to update existing exercises rather than create duplicates.

alter table public.exercises
  add constraint exercises_org_id_name_key unique (org_id, name);
