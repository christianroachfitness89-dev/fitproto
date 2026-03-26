-- migration_v23: Template library for tasks and habits
-- Adds is_template flag + makes habits.client_id nullable

-- 1. Make habits.client_id nullable (templates have no client)
ALTER TABLE habits ALTER COLUMN client_id DROP NOT NULL;

-- 2. Add is_template flag to tasks
ALTER TABLE tasks  ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false;

-- 3. Add is_template flag to habits
ALTER TABLE habits ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false;

-- 4. Ensure existing rows stay non-template
UPDATE tasks  SET is_template = false WHERE is_template IS NULL;
UPDATE habits SET is_template = false WHERE is_template IS NULL;

-- RLS: templates still belong to the org so existing policies cover them.
-- No policy changes needed since get_user_org_id() check on org_id is sufficient.
