-- ============================================================
-- FitProto Migration v4
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- Adds unit system preference to organizations
-- ============================================================

alter table public.organizations
  add column if not exists unit_system text not null default 'imperial'
    check (unit_system in ('imperial', 'metric'));
