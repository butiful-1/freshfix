-- Run in Supabase Dashboard → SQL Editor.
-- Apple In-App Purchase support (App Store Guideline 3.1.1).
--
-- 1) profiles.entitlement_source records WHICH system granted the current
--    paid plan ('stripe' | 'apple' | null for free). Existing paid rows were
--    only ever written by the Stripe webhook, so they are backfilled as
--    'stripe'. profiles.plan values are untouched ('free' | 'wellness' |
--    'family'); nothing is renamed.
-- 2) apple_subscriptions stores one row per Apple subscription (keyed by
--    Apple's originalTransactionId) so renewals, upgrades, expirations,
--    refunds and revocations reported by App Store Server Notifications can
--    be applied to the right user, and so Stripe cancellations never wipe an
--    active Apple entitlement.

alter table public.profiles
  add column if not exists entitlement_source text
    check (entitlement_source in ('stripe', 'apple'));

update public.profiles
   set entitlement_source = 'stripe'
 where entitlement_source is null
   and plan in ('wellness', 'family');

create table if not exists public.apple_subscriptions (
  original_transaction_id   text primary key,
  user_id                   uuid references auth.users(id) on delete cascade,
  product_id                text not null,
  plan                      text not null,
  status                    text not null default 'subscribed',
  environment               text,
  app_account_token         uuid,
  last_transaction_id       text,
  last_notification_type    text,
  auto_renew_product_id     text,
  will_auto_renew           boolean,
  purchase_date             timestamptz,
  expires_at                timestamptz,
  grace_period_expires_at   timestamptz,
  revoked_at                timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists apple_subscriptions_user_id_idx
  on public.apple_subscriptions (user_id);

alter table public.apple_subscriptions enable row level security;

-- Owners may read their own rows (used by nothing yet, kept for support
-- tooling); every write goes through the service role from the server.
drop policy if exists "owner_read_apple_subscriptions" on public.apple_subscriptions;
create policy "owner_read_apple_subscriptions"
  on public.apple_subscriptions for select
  using (auth.uid() = user_id);
