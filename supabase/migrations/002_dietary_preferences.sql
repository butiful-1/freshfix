-- Run this in your Supabase project:
-- Dashboard → SQL Editor → New query → paste → Run

-- ── Add dietary_preferences to profiles ──────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dietary_preferences JSONB NOT NULL DEFAULT '{}';
