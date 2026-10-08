# Build 7 — deployment, migration and verification runbook

Order matters: the migration adds a column the new server code reads, so run
it **before** deploying. Nothing here submits anything to Apple.

## 1. Supabase migration 006 (run first)

Supabase Dashboard → SQL Editor → New query → paste
`supabase/migrations/006_apple_subscriptions.sql` → Run.

What it does (idempotent; safe to re-run):
- adds `profiles.entitlement_source` (`'stripe' | 'apple' | 'manual'`, nullable);
- backfills `'stripe'` on every current paid row (they were all written by the
  Stripe webhook or by hand);
- marks the App Review account (`kimwallace.1@yahoo.com`) `'manual'` — a
  protected complimentary membership that no Apple/Stripe event can change;
- creates `apple_subscriptions` with RLS (owner read; service-role writes).

Verify (SQL Editor):
```sql
select plan, entitlement_source, count(*) from public.profiles group by 1,2 order by 1,2;
select u.email, p.plan, p.entitlement_source from public.profiles p join auth.users u on u.id = p.id where u.email = 'kimwallace.1@yahoo.com';
select count(*) from public.apple_subscriptions;   -- 0 until the first Apple purchase
```
Expected: paid rows show `stripe` (reviewer row shows `manual`), free rows
`null`; the reviewer row is `family / manual`.

Rollback (only if needed): `drop table public.apple_subscriptions; alter table
public.profiles drop column entitlement_source;` — no `plan` value is touched
by the migration, so existing subscribers are unaffected either way.

## 2. Vercel environment

Settings → Environment Variables (Production + Preview):
- `APPLE_APP_APPLE_ID` = the numeric Apple ID of the app (App Store Connect →
  App Information → General Information → Apple ID). Required to verify
  **Production** transactions; Sandbox/App Review verification works without it.
- Already present and unchanged: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_WELLNESS_PRICE_ID`,
  `STRIPE_FAMILY_PRICE_ID`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`.
- Do NOT set `APPLE_ALLOW_XCODE_ENV` on Vercel (local-only).

## 3. Deploy the web/API

Merge `feat/ios-iap-health-citations` into `master` (PR as with builds 4–6);
Vercel deploys production from `master`. After deploy:
- `https://old2new.app/references` renders the References page;
- `https://old2new.app/api/apple/verify` answers `401 {"error":"Not signed in"}`
  to an unauthenticated POST (proves the route is live);
- App Store Connect → App Information → App Store Server Notifications →
  **Send Test Notification** (sandbox) → Vercel log shows `[apple/notifications] TEST`.
- Website: terms.html / privacy.html show "Last updated: October 8, 2026".

## 4. iOS build for TestFlight / App Review

```
npm run ios:sync            # NO VITE_APPLE_API_ORIGIN / VITE_API_ORIGIN in the environment
open ios/App/App.xcodeproj  # Product → Archive → Distribute → App Store Connect → Upload
```
Build number is 7 (marketing version 1.0). The archive must come from a
bundle built without the debug origin overrides — verify with
`grep -c 127.0.0.1 ios/App/App/public/assets/*.js` (all zero).
**Do not upload or submit without Kim's approval.**

## 5. Sandbox verification (after 1–4 and the App Store Connect IAP setup)

Prerequisites: `docs/app-store-connect-iap-setup.md` sections 1–5 and 10
(agreement, group, both products, ranking, sandbox tester); the TestFlight
build installed on an iPhone or iPad signed into the Sandbox Apple Account
(Settings → App Store → Sandbox Account). Sandbox subscriptions renew every
5 minutes and expire after 6 renewals.

Create a fresh disposable Old2New account (confirm its email), sign in, then:

| # | Step | Expected (Supabase: `profiles` row + `apple_subscriptions`) |
|---|---|---|
| 1 | Pricing → Subscribe to Plus → confirm sandbox sheet | `plan='wellness'`, `entitlement_source='apple'`, row `status='subscribed'`, `swaps_used=0`; app shows Plus as current with "Billed through your Apple Account"; Home counter "50 of 50" |
| 2 | Pricing → Switch to Premium → confirm (upgrade) | `plan='family'`; same `original_transaction_id`, `product_id` premium; Home "150 of 150" |
| 3 | Settings → Apple Account → Subscriptions → choose Plus (downgrade at renewal) | after the next 5-minute renewal: `plan='wellness'`, row product plus |
| 4 | Cancel the subscription in Settings → wait for expiry (≤ 6 renewals) | `EXPIRED` notification → `plan='free'`, `entitlement_source=null`, row `status='expired'`; app returns to Free, Pricing shows Subscribe buttons again |
| 5 | Re-subscribe, then Settings → Report a Problem (sandbox refund) | `REFUND` notification → `plan='free'`, row `status='refunded'` |
| 6 | Delete + reinstall the app, sign in, Pricing → Restore Purchases | newest valid state restored (active plan shown; or "No Apple subscription was found" after expiry/refund) |
| 7 | Sign in on a second device with the same Old2New account | same plan (entitlement is account-level) |
| 8 | Sign in with a different Old2New account on the same Apple ID and tap Restore | 409 "already linked to a different Old2New account" — no entitlement sharing |
| 9 | Reviewer account (`kimwallace.1@yahoo.com`) | unchanged throughout: `family / manual`, "Complimentary plan" |

Server-side evidence: Vercel logs `[apple/verify] user … → plan …` and
`[apple/notifications] <TYPE>: user … → plan …`.
