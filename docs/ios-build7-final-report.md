# Old2New iOS 1.0 (build 7) — remediation report

Status at 2026-10-08. Branch `feat/ios-iap-health-citations`, commit `d1485b0`
(not pushed, not submitted). Nothing has been uploaded to App Store Connect.

## 1. Audit findings
See `docs/apple-rejection-remediation-plan.md` Part A. Key points: the only paid
items are the Plus/Premium monthly subscriptions (Stripe, web only; internal
values `wellness`/`family`); "Recipe Upgrades" is the metered transformation
unit, not a product; nutrition values are AI estimates with no calculation
step; the Stripe webhook downgraded by email unconditionally; the delete-account
modal promised to cancel "any subscription".

## 2. Files changed
65 files, +3,694 / −139. New: `api/apple/verify.js`, `api/apple/notifications.js`,
`api/_lib/{appleVerifier,appleEntitlement,appleProducts,entitlement,claimGuard,claimRules}.js`,
`api/_lib/apple-roots/*.cer`, `src/iap/{products,store}.js`, `src/platform.js`,
`src/healthDisclaimer.js`, `src/data/{healthSources,healthGoals}.js`,
`src/components/{ReferencesScreen,ReferencesPage}.jsx`,
`src/components/shared/SourcesLink.jsx`, `supabase/migrations/006_apple_subscriptions.sql`,
`ios/App/App/Old2New.storekit`, `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme`,
`scripts/check-health-links.mjs`, four test files, three docs. Modified: App.jsx,
Pricing/Upgrade/Home/Saved/About/Results/WhatSoundsGood/Share/Onboarding/
Disclaimer/BottomNav/RecipeResultTabs/CookbookPDF, apiBase, publicRecipes,
transform/suggest/sync-recipe/webhook/verify-session APIs, server/index.js,
terms.html, privacy.html, pbxproj (build 7), Package.swift (plugin).

## 3. IAP architecture
`@capgo/native-purchases` 8.8.3 (MPL-2.0, StoreKit 2, Capacitor 8) wrapped in
`src/iap/store.js`; server verification with `@apple/app-store-server-library`
3.1.0 against Apple's root certificates (no private key needed); entitlements
written only by the server with the Supabase service role. Chosen over a custom
Swift plugin (more code to own) and RevenueCat (new vendor, second entitlement
authority, paid tier). Transactions are finished only after the server records
them; unfinished ones are re-delivered by StoreKit at next launch.

## 4. Product IDs (proposed → final once created in App Store Connect)
- `app.old2new.ios.plus.monthly` — Old2New Plus Monthly — $14.99/month
- `app.old2new.ios.premium.monthly` — Old2New Premium Monthly — $24.99/month
- Group `Old2New Membership`; Premium level 1, Plus level 2.

## 5. Recipe Upgrades
Included in the subscription entitlement (the monthly quota). No separate IAP.

## 6. Stripe / Supabase entitlement mapping
`profiles.plan` unchanged (`free|wellness|family`); new `profiles.entitlement_source`
(`stripe|apple|null`); new `apple_subscriptions` table keyed by Apple
originalTransactionId with `app_account_token = Supabase user id`. Rules in
`api/_lib/entitlement.js`: highest active tier wins; Apple grant resets usage on
a new/upgraded tier; Apple expiry → live Stripe check → Stripe plan or free;
Stripe deletion → keep an active Apple plan; Stripe checkout → sets source
'stripe' unless a higher Apple tier is active. 23 unit tests.

## 7. Server verification
Device JWS → `POST /api/apple/verify` (Supabase Bearer auth) → signature +
bundle + environment + product + owner checks → upsert → reconcile. App Store
Server Notifications V2 → `POST /api/apple/notifications` → same pipeline for
SUBSCRIBED, DID_RENEW, DID_CHANGE_RENEWAL_PREF/STATUS, DID_FAIL_TO_RENEW (grace),
EXPIRED, GRACE_PERIOD_EXPIRED, REFUND, REFUND_REVERSED, REVOKE, OFFER_REDEEMED,
RENEWAL_EXTENDED, PRICE_INCREASE. App Store Server API reconciliation (needs
the .p8 key) is NOT implemented — reserved as a follow-up.

## 8. Secrets / config Kim must set
- Vercel `APPLE_APP_APPLE_ID` (numeric App Apple ID) — required for Production
  verification. Sandbox (App Review) works without it.
- Optional: `APPLE_IAP_KEY_P8`, `APPLE_IAP_KEY_ID`, `APPLE_IAP_ISSUER_ID`.
- Local `.env` (never committed) for an end-to-end local test:
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APPLE_ALLOW_XCODE_ENV=1`.
- Run `supabase/migrations/006_apple_subscriptions.sql` in the Supabase SQL editor.

## 9. Health claims changed
- publicRecipes.js: "eliminates the blood sugar spike", "zero glycemic impact",
  "slow glucose absorption", "research suggests … reduce post-meal blood sugar
  spikes", "insulin-friendly power", "managing insulin resistance", "helps
  regulate blood sugar" (×2), "ideal for managing blood sugar spikes", "may
  improve insulin sensitivity and reduce inflammation", "actively work to calm
  inflammation", "well-documented anti-inflammatory effects", "nature's
  anti-inflammatory pharmacy" → rewritten as ingredient characteristics.
- AboutScreen: "No Nuts — Nut-allergy safe" → "Excludes nuts and nut products —
  always check labels; not a guarantee against cross-contamination";
  "managing a GLP-1 medication like Ozempic or Wegovy" → "eating in a
  GLP-1-friendly way".
- ResultsScreen: calorie headline and "cal saved" now labelled "(est.)" /
  "about"; "(more protein)" claim removed.
- Prompts (transform, suggest, sync, local server): claim-language rules +
  per-serving/rounding instruction; server-side claim guard with 16 patterns,
  one model rewrite, sentence-strip fallback (26 tests).
- Goal names (Diabetic Friendly, GLP-1 Friendly, Mediterranean, High Protein)
  unchanged, each now has a neutral definition and sources.

## 10. Source list
30 entries in `src/data/healthSources.js` (USDA FoodData Central, Dietary
Guidelines 2020–2025, FDA ×6, eCFR 21 CFR 101.9, NIH NIDDK ×3, CDC ×3, ADA ×2,
ADA Standards of Care 2025 §5 via PubMed Central, NCCIH ×2, NHLBI DASH,
MedlinePlus ×4, NASEM DRIs, PREDIMED (PubMed), Paddon-Jones 2008, StatPearls
Ketogenic Diet, MyPlate). `node scripts/check-health-links.mjs` → all 30
resolved on 2026-10-08.

## 11. Nutrition methodology
`src/healthDisclaimer.js` NUTRITION_METHODOLOGY: AI-estimated from typical
ingredient composition (USDA FoodData Central reference), per serving as stated,
rounded to whole calories/grams; excludes brand variation, cooking losses,
exact portions; before/after is an estimate of direction, not an exact
difference. Shown in the Results "How we estimate" sheet, Macros tab,
References screen/page and the PDF cookbook.

## 12. Disclaimer locations
First-run DisclaimerPopup; every Sources sheet; About → Health Disclaimer;
References screen and /references; Results screen badge; public recipe tabs
and share screen; Pricing footer (short form); PDF cover and final page.

## 13. Tests actually run — results
- `npx vitest run`: 10 files, **174 passed** (102 pre-existing + 72 new).
- `node scripts/check-health-links.mjs`: **30/30 links resolve**.
- `npm run build` (vite + prerender 109 routes): **clean**; `npm run ios:sync`: clean.
- `xcodebuild … -scheme App -configuration Debug` for iPhone 17 Pro Max
  simulator: **BUILD SUCCEEDED** (plugin compiles, 3 Capacitor plugins).
- Simulator launch via simctl: app launches to the splash screen; device log
  shows the StoreKit plugin start (`TransactionUpdateStart`, `Products_SK2`).
- Claim-guard scan of the static demo recipes: 0 violations.
- Server modules import cleanly; local dev server starts and serves `/api/health`.

## 14. Tests blocked — and why
- **LOCAL STOREKIT TEST: BLOCKED (not run).** The Mac's login session is locked
  (`CGSSessionScreenIsLocked = true`), so neither Xcode (needed to launch with
  the StoreKit configuration) nor synthetic taps into the Simulator work.
  Unlock the Mac and keep it awake, then run the scheme `App` on iPhone 17 Pro
  Max / iPad Air 11-inch from Xcode (the shared scheme already loads
  `Old2New.storekit`).
- **Signed-in iOS QA (transform, save, PDF, paywall, purchase, restore, sign
  out, delete): BLOCKED.** Sign-up requires email confirmation; no confirmed
  test account is available. A QA user `qa-ios-build7@old2new.app` was created
  (unconfirmed) on 2026-10-08 — confirm it in Supabase → Authentication → Users,
  or provide a confirmed test login.
- **Entitlement sync end-to-end on device: BLOCKED** until the local `.env` has
  `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (or until the branch is deployed
  and tested in Sandbox).
- **APPLE SANDBOX / TESTFLIGHT TEST: BLOCKED — REQUIRES APP STORE CONNECT
  CONFIGURATION** (see `docs/app-store-connect-iap-setup.md`).
- iPhone / iPad smoke tests: not run (same blockers). Paywall review screenshot
  (`docs/app-store/iphone-6.9-07-paywall.png`) not yet captured.

## 15. App Store Connect steps remaining
`docs/app-store-connect-iap-setup.md` sections 1–12 (agreement, group, two
subscriptions, ranking, notifications URL, EULA, `APPLE_APP_APPLE_ID`,
migration 006, sandbox tester, attach IAPs to the 1.0 submission, review notes
and metadata edits).

## 16. App Review notes
`docs/app-review-notes-build7.md` — ready to paste after filling the test
account placeholders.
