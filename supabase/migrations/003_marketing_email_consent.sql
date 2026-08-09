-- Run this in your Supabase project:
-- Dashboard → SQL Editor → New query → paste → Run

-- ── Add marketing email consent tracking to profiles ─────────────────
-- Phase 1: email consent only. Collection/storage only — no marketing
-- emails are sent as a result of this migration. Default is false so
-- every existing and new profile starts opted out.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketing_email_consent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_email_consented_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS marketing_email_consent_source TEXT,
  ADD COLUMN IF NOT EXISTS marketing_email_consent_version TEXT;

-- No RLS policy changes needed — these columns live on the same row
-- already covered by the existing "Users can update own profile" policy.
-- handle_new_user() is intentionally left unchanged; the column default
-- (false) covers new rows, and the app syncs signup-time consent in on
-- first login (see loadProfile in src/App.jsx).
