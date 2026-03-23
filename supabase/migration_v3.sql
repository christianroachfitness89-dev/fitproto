-- ============================================================
-- FitProto Migration v3
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- Extends exercises table to match the CSV exercise database
-- ============================================================

alter table public.exercises
  add column if not exists difficulty           text,
  add column if not exists secondary_muscle     text,
  add column if not exists tertiary_muscle      text,
  add column if not exists movement_pattern     text,
  add column if not exists body_region          text,
  add column if not exists mechanics            text,
  add column if not exists laterality           text,
  add column if not exists posture              text,
  add column if not exists video_explanation_url text;
