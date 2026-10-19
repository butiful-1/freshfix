-- Run in Supabase Dashboard → SQL Editor.
-- Google Play Billing support for the Android app (package app.old2new.twa).
--
-- 1) profiles.entitlement_source gains the value 'google'. Existing values
--    ('stripe' | 'apple' | 'manual' | null) and every profiles.plan value are
--    untouched; nothing is renamed and no existing row changes.
-- 2) google_subscriptions stores one row per Google Play purchase token so
--    renewals, upgrades/downgrades, cancellations, grace periods, account
--    holds, pauses, expirations and refunds reported by Real-time developer
--    notifications can be applied to the right user — and so a Stripe or
--    Apple change never wipes an active Google Play entitlement (and vice
--    versa). Only the service role writes here.

alter table public.profiles
  drop constraint if exists profiles_entitlement_source_check;

alter table public.profiles
  add constraint profiles_entitlement_source_check
    check (entitlement_source in ('stripe', 'apple', 'google', 'manual'));

create table if not exists public.google_subscriptions (
  purchase_token            text primary key,
  user_id                   uuid references auth.users(id) on delete cascade,
  product_id                text,
  base_plan_id              text,
  plan                      text,
  status                    text not null default 'pending',
  subscription_state        text,
  acknowledged              boolean not null default false,
  auto_renewing             boolean,
  linked_purchase_token     text,
  latest_order_id           text,
  deferred_product_id       text,
  test_purchase             boolean not null default false,
  region_code               text,
  obfuscated_account_id     text,
  last_notification_type    text,
  start_time                timestamptz,
  expires_at                timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists google_subscriptions_user_id_idx
  on public.google_subscriptions (user_id);

create index if not exists google_subscriptions_linked_token_idx
  on public.google_subscriptions (linked_purchase_token);

alter table public.google_subscriptions enable row level security;

-- Owners may read their own rows (support tooling); every write goes through
-- the service role from the server.
drop policy if exists "owner_read_google_subscriptions" on public.google_subscriptions;
create policy "owner_read_google_subscriptions"
  on public.google_subscriptions for select
  using (auth.uid() = user_id);
