# App Store Connect — In-App Purchase setup for Old2New (build 7)

Exact values to enter. Everything here needs the Account Holder / Admin role.
Until these steps are complete, Sandbox and TestFlight purchases cannot be
tested and App Review cannot buy a subscription — see the blockers list at the end.

## 1. Agreements, Tax, and Banking (blocks everything else)

App Store Connect → **Business** (or Agreements, Tax, and Banking) →
**Paid Apps** agreement: must show *Active*. Complete the tax forms (W-9 for a
U.S. entity) and add a bank account. Products do not load in Sandbox until this
is done.

## 2. Subscription group

My Apps → **Old2New** → Monetization → **Subscriptions** → Create (+ group)

| Field | Value |
|---|---|
| Reference Name | `Old2New Membership` |
| App Store Localization (English (U.S.)) → Subscription Group Display Name | `Old2New Membership` |
| App name display option | Use app name (Old2New) |

## 3. Subscription: Plus

Inside the group → **Create Subscription**

| Field | Value |
|---|---|
| Reference Name | `Old2New Plus Monthly` |
| Product ID | `app.old2new.ios.plus.monthly` |
| Subscription Duration | 1 month |
| Availability | All countries or regions |
| Subscription Prices | United States: **$14.99** (let Apple generate the other territories from the USD price) |
| Localization — Display Name | `Old2New Plus` |
| Localization — Description | `50 recipe transformations per month, save up to 50 recipes, PDF cookbook.` |
| Family Sharing | Off |
| Review Information — Screenshot | `docs/app-store/iphone-6.9-07-paywall.png` (captured from build 7; see QA notes) |
| Review Information — Notes | `Monthly auto-renewing subscription. Unlocks 50 recipe transformations/month and the PDF cookbook. Purchase from the Pricing tab.` |

## 4. Subscription: Premium

| Field | Value |
|---|---|
| Reference Name | `Old2New Premium Monthly` |
| Product ID | `app.old2new.ios.premium.monthly` |
| Subscription Duration | 1 month |
| Availability | All countries or regions |
| Subscription Prices | United States: **$24.99** |
| Localization — Display Name | `Old2New Premium` |
| Localization — Description | `150 recipe transformations per month, save up to 150 recipes, PDF cookbook, priority support.` |
| Family Sharing | Off |
| Review Information — Screenshot | same paywall screenshot |
| Review Information — Notes | `Monthly auto-renewing subscription. Unlocks 150 recipe transformations/month and the PDF cookbook. Purchase from the Pricing tab.` |

## 5. Group ranking (upgrade / downgrade)

In the group's subscription list, drag so that **Old2New Premium Monthly is
Level 1** and **Old2New Plus Monthly is Level 2**. This makes Plus → Premium an
upgrade (immediate, prorated) and Premium → Plus a downgrade (at next renewal)
and guarantees a customer can never hold both.

## 6. App Store Server Notifications (V2)

My Apps → Old2New → **App Information** → App Store Server Notifications

| Field | Value |
|---|---|
| Production Server URL | `https://old2new.app/api/apple/notifications` |
| Sandbox Server URL | `https://old2new.app/api/apple/notifications` |
| Version | Version 2 Notifications |

The endpoint reads the environment from the signed payload, so both URLs are
the same. After saving, use **Send Test Notification** (sandbox); the Vercel
log should show `[apple/notifications] TEST`.

## 7. License agreement / Terms of Use

App Information → **License Agreement**: either keep Apple's Standard EULA or
set a custom one. The app links to `https://old2new.app/terms.html` and
`https://old2new.app/privacy.html` on the paywall (both updated for Apple
billing on 2026-10-08). Privacy Policy URL stays `https://old2new.app/privacy.html`.

## 8. Vercel environment variables (Settings → Environment Variables)

| Variable | Value | Required? |
|---|---|---|
| `APPLE_APP_APPLE_ID` | the numeric **Apple ID** of the app (App Information → General Information → Apple ID, e.g. `6740000000`) | **Yes** — without it the server cannot verify *Production* transactions (Sandbox/App Review verification works without it) |
| `APPLE_IAP_KEY_P8`, `APPLE_IAP_KEY_ID`, `APPLE_IAP_ISSUER_ID` | In-App Purchase key from Users and Access → Integrations → In-App Purchase | Optional — not used by build 7; reserved for App Store Server API reconciliation |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WELLNESS_PRICE_ID`, `STRIPE_FAMILY_PRICE_ID` | already configured | unchanged |

Never put any of these in git.

## 9. Supabase migration

Supabase Dashboard → SQL Editor → paste and run
`supabase/migrations/006_apple_subscriptions.sql`. It adds
`profiles.entitlement_source` (backfilled to `'stripe'` for current paid rows)
and the `apple_subscriptions` table. No `plan` values are changed.

**App Review account.** The dedicated reviewer account
(`kimwallace.1@yahoo.com`) has a reserved Premium membership (`plan = 'family'`,
`swaps_used` resets monthly). The migration marks that one row
`entitlement_source = 'manual'`, which the server treats as protected: no
Apple or Stripe event can downgrade or change it, the iOS paywall shows it as
"Complimentary plan" and never sells an Apple subscription on top of it, and
nothing about it affects other users. Run the migration *before* the review
build is tested so the label reads "Complimentary plan" rather than
"Purchased on old2new.app" (both are harmless). Do not delete or edit that
account.

## 10. Sandbox tester

Users and Access → **Sandbox** → Testers → + → create a sandbox Apple Account
(any unused email). On the test iPhone/iPad: Settings → App Store → scroll to
**Sandbox Account** → sign in. Subscriptions renew every 5 minutes in sandbox.

## 11. Attach the subscriptions to the 1.0 submission

On the version page (1.0, build 7): **In-App Purchases and Subscriptions** →
add both subscriptions. First-time IAPs must be submitted together with a
binary; they are reviewed with the app.

## 12. App Review information (version page)

- Sign-in required: **Yes** — provide a confirmed test account (see
  `docs/app-review-notes-build8.md`, which is the text to paste into Notes).
- Confirm the metadata edits in that document (description bullet about the
  guides library; "heart-healthy" wording).

## 13. In-App Purchase review screenshot

Each subscription needs a review screenshot (≥ 640 × 920 px) showing the
purchase UI. Capture it on the Sandbox QA device after step 10: sign in with
the fresh disposable account → Pricing tab (Free plan, Subscribe buttons
visible) → screenshot. Save as `docs/app-store/iphone-6.9-07-paywall.png`
and upload it for both subscriptions.

## 14. Sandbox verification

Follow `docs/ios-build7-deployment.md` §5 after the build is on TestFlight.

## Blockers summary

Until steps 1–5 and 9 are done: **BLOCKED — REQUIRES APP STORE CONNECT
CONFIGURATION** for every Sandbox / TestFlight purchase test. Step 8
(`APPLE_APP_APPLE_ID`) is required before any *production* purchase can be
verified after launch; App Review itself buys in the Sandbox environment.
