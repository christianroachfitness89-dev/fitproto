-- ============================================================
-- FitProto Migration v5
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- Links workout_logs back to the client_workout assignment
-- ============================================================

alter table public.workout_logs
  add column if not exists client_workout_id uuid
    references public.client_workouts(id) on delete set null;
