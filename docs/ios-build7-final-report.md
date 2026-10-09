# Old2New iOS 1.0 (build 7) — remediation report

Status at 2026-10-08. Branch `feat/ios-iap-health-citations` merged to `master`
via PR #8 (merge commit `c29c45e`) and deployed to production by Vercel.
Migration 006 applied and verified by Kim (family/manual 1, wellness/stripe 1,
free 59, apple_subscriptions 0 rows). `APPLE_APP_APPLE_ID` set (Production +
Preview). Nothing has been uploaded to App Store Connect or submitted to Apple.

Post-deploy verification (2026-10-08, production): `/api/apple/verify` 401 to
an unauthenticated POST; `/api/apple/notifications` 400 without payload, 401
"could not be verified" for forged Sandbox AND Production payloads (the
Production case proves `APPLE_APP_APPLE_ID` is read — a missing value answers
503), 503 for an Xcode-environment payload; a signed-in user sending an
Xcode-environment transaction is refused (503, never written); Terms and
Privacy show "Last updated: October 8, 2026"; `/references` serves the app and
the deployed bundle contains the References screen; Stripe checkout and
health endpoints unchanged; reviewer row still `family / manual`.

Post-deploy finding (fixed in commit `ec121c5`, pushed and redeployed; verified
on production by planting an invalid session — the SIGNED_OUT path fired and
`/references` stayed on the References page; `scripts/verify-deploy.sh`: all
9 checks pass against the new bundle): in a browser
holding an expired Supabase session, `/references` bounced to the homepage
because the route was missing from `isPublicPath` (the sign-out handler sends
every non-public path to the splash). `/references` is now public, the three
duplicated path lists in App.jsx use `isPublicPath`, and a test covers it. The
in-app References screen was never affected.

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
(`stripe|apple|manual|null` — `manual` marks hand-granted memberships such as the
App Review account; the server never changes a `manual` row and the iOS paywall
shows it as complimentary and not purchasable); new `apple_subscriptions` table keyed by Apple
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

Automated
- `npx vitest run`: 10 files, **190 passed** (102 pre-existing + 88 new).
- `node scripts/check-health-links.mjs`: **30/30 links resolve** (2026-10-08).
- `npm run build` (vite + prerender 109 routes) and `npm run ios:sync`: clean.
- `xcodebuild` Debug for the iPhone 17 Pro Max simulator: **BUILD SUCCEEDED**
  (5 Capacitor plugins: app, browser, filesystem, share, native-purchases).
- `xcodebuild` Release, generic iOS device, `CODE_SIGNING_ALLOWED=NO`
  (compile check for the archive): **BUILD SUCCEEDED** on the production-origin
  bundle (no debug origin overrides in `ios/App/App/public`).
- Claim-guard scan of the static demo recipes: 0 violations.

Signed-out, iPhone 17 Pro Max simulator (Xcode run, StoreKit configuration active)
- Launch, splash, Browse Recipes, demo quick view: PASS. "Sources" sheet opens
  and the USDA FoodData Central link opens in the in-app Safari sheet: PASS.

Reviewer account (`kimwallace.1@yahoo.com`, complimentary Premium — inspected
via the API: `plan=family`, `swaps_used` 0→3 this month, no Stripe/Apple rows;
nothing changed except three transformations and one test recipe that was
saved and then deleted again)
- Sign in (email/password): PASS. Session restoration after three Xcode
  relaunches: PASS (still signed in, counters correct). Sign out: PASS
  ("Signed out successfully" toast, back to splash). Sign in again: PASS.
- Recipe Transform, all four goals: Diabetic Friendly (Chicken Alfredo),
  Mediterranean (Beef Lasagna), GLP-1 Friendly (Shrimp Scampi), High Protein
  (+GLP-1, same dish): PASS. Results show "calories (est.)", "about N cal",
  "How we estimate" sheet with methodology + sources, Swaps "Sources" sheet,
  Macros "How we estimate · Sources" sheet with goal-specific topics, full
  disclaimer badge with "Sources & References" link: PASS.
- "What these mean" goal definitions (Home) and About → Supported Diets
  sources, About → Sources & References → References screen: PASS.
- What Sounds Good → Dinner → ideas with "~N cal (est.)" and Sources: PASS.
- Save to Cookbook: PASS (then deleted to leave the account unchanged).
- PDF cookbook (paid feature): PASS after fix — opens the native share sheet;
  Preview shows cover disclaimer, 6 recipes, Sources & References pages.
- Pricing tab: StoreKit products load from the local configuration ($14.99 /
  $24.99), Premium shown as current with "Purchased on old2new.app", Plus card
  informational ("billed on old2new.app"), Restore Purchases (StoreKit test
  sign-in sheet → "No Apple subscription was found for this Apple Account.",
  plan unchanged), subscription disclosure + Terms/Privacy links: PASS.
- About → Subscription: current plan, Restore Purchases: PASS.

Reviewer account, iPad Air 11-inch (M4) simulator (Xcode run)
- Launch, splash (tablet layout), sign in, Home, Pricing (products, web-managed
  treatment, Restore, disclosure), goal-definitions sheet: PASS.

Not exercised with the reviewer account by design (reserved membership must
not change): Apple purchase, upgrade/downgrade, expiry, account deletion.

Disposable QA account (`butiful@yahoo.com`, free plan, confirmed by Kim),
iPad Air 11-inch simulator, Xcode run with the local StoreKit configuration
- Free tier: "5 of 5 Recipe Upgrades", Upgrade button, Pricing tab visible,
  Free card marked current, Subscribe buttons on Plus and Premium with the
  per-card terms line, Restore Purchases, disclosure + Terms/Privacy: PASS.
- Plus purchase: StoreKit sheet "Old2New Plus $14.99 per month" → Subscribe →
  "You're all set": PASS (LOCAL STOREKIT).
- Premium while Plus is active: StoreKit sheet shows "Your upgrade will start
  now. You'll receive a refund for the remainder of your current subscription"
  → PASS — proves both products are in one group (3.1.2(b)); Transaction
  Manager shows ID 1 Premium with original transaction ID 0 (the Plus
  purchase), i.e. one subscription, no duplicate.
- Downgrade: Transaction Manager → Subscription Options → Old2New Plus → Save
  (renewal preference changed, access continues on Premium until period end):
  PASS. Cancel Subscription → Save: PASS.
- Refund (revocation): Transaction Manager → Refund Purchase → the app's
  transactionUpdated listener fired immediately and the server logged the same
  transaction as REVOKED: PASS.
- Server verification path (local dev server, APPLE_ALLOW_XCODE_ENV=1): for
  the launch-time sync, Restore and the live refund, the server authenticated
  the QA user from the Supabase token and verified the Xcode-signed JWS
  (`app.old2new.ios.premium.monthly #1/0 exp=2026-11-08 … REVOKED`): PASS.
- Restore Purchases: triggers StoreKit's test sign-in sheet, queries current
  entitlements and calls the server with every transaction on the device
  (before the refund: the Premium upgrade; after it: the revoked Premium
  upgrade plus the original Plus purchase, both verified): PASS. That second
  call exposed a real bug — the older Plus transaction in the same
  subscription chain was applied after the revoked Premium one and would have
  re-granted access. Fixed: the server now applies only the newest
  transaction per originalTransactionId, skips transactions StoreKit marks as
  upgraded, and refuses to overwrite a newer recorded state with an older
  transaction (3 new tests). While the server is unavailable the paywall shows
  "We could not confirm your subscription with our server just now…" and the
  Free plan stays in force: PASS.
- Purchase → `profiles.plan` written → plan shown in the app: **NOT VERIFIED
  LOCALLY.** Every call stopped at `Supabase service role is not configured`
  (the local `.env` has no `SUPABASE_SERVICE_ROLE_KEY`). The app shows the
  user-facing fallback message and keeps the StoreKit transaction unfinished
  so it is retried at next launch — that path was observed.
- Account deletion (disposable account): About → Delete Account → in-app
  confirmation modal → "Permanently delete my account" → app returns to the
  signed-out home; the account can no longer sign in (API check) and the
  reviewer account is intact: PASS. (The modal had the same off-screen
  positioning fault as the Sources sheet on a scrolled page; fixed by
  rendering it through a portal.)

Known observations (not blockers)
- Production API still runs the pre-remediation prompt until this branch is
  deployed, so live transform text can still contain phrases the new claim
  guard would rewrite (seen: "helps stabilize blood sugar"). Deploying the
  branch activates the prompt rules and the guard.
- First auth check after a cold launch occasionally takes 5–10 s on the
  simulator (pre-existing safety-net UI appears, then the app continues).

## 14. Tests blocked — and why
- **Purchase → Supabase plan write: VERIFIED IN APPLE SANDBOX (2026-10-09).**
  Build 7 from TestFlight on Kim's iPhone, sandbox tester, QA account
  `butiful@yahoo.com`: Premium purchase → `/api/apple/verify` wrote
  `apple_subscriptions` (originalTransactionId 2000001248608534, product
  premium, environment Sandbox, status subscribed, expires 2026-10-10 16:25 UTC)
  and `profiles.plan='family'`, `entitlement_source='apple'`, `swaps_used=0`;
  About shows "Billed through your Apple Account" with Manage Subscription.
  Products had not loaded on the device for a period after the Paid Apps
  Agreement activated (propagation delay); they loaded later the same morning.
- **Still to verify in Sandbox:** Plus purchase on a fresh account, upgrade,
  downgrade/cancel/refund via notifications (no `last_notification_type` has
  been recorded yet for the row above — watch for SUBSCRIBED/DID_RENEW), and
  Restore after reinstall. Previously: BLOCKED LOCALLY — VERIFY IN APPLE
  SANDBOX AFTER DEPLOYMENT.**
  Kim's decision: no service-role key for local testing. The verification,
  authentication and reconciliation logic is unit-tested (193 tests) and the
  device → server path was exercised locally up to the database write.
  Runbook: `docs/ios-build7-deployment.md` §5.
- **APPLE SANDBOX / TESTFLIGHT TEST: BLOCKED — REQUIRES APP STORE CONNECT
  CONFIGURATION** (see `docs/app-store-connect-iap-setup.md`) plus deploying
  this branch to Vercel and running migration 006.
- Paywall review screenshot for App Store Connect: `docs/app-store/ipad-13-07-paywall.png`
  can be captured from the current free-account state on request.

## 15. App Store Connect steps remaining
`docs/app-store-connect-iap-setup.md` sections 1–12 (agreement, group, two
subscriptions, ranking, notifications URL, EULA, `APPLE_APP_APPLE_ID`,
migration 006, sandbox tester, attach IAPs to the 1.0 submission, review notes
and metadata edits).

## 16. App Review notes
`docs/app-review-notes-build8.md` — ready to paste after filling the test
account placeholders.
