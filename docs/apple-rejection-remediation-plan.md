# Old2New iOS — App Store rejection remediation: audit + plan

Build 1.0 (6) was rejected under **3.1.1 In-App Purchase** and **1.4.1 Safety /
health information**. This document is the Phase 1 audit and the Phase 2 plan.
**No code has been changed.** Nothing below is implemented until Kim approves.

Audit date: 2026-10-08. Branch `master` at `c907835`. Baseline: `npx vitest run`
→ 6 files, 102 tests, all passing.

---

## Part A — Audit findings

### A1. Everything that is sold or unlocked (web, Stripe, Supabase, iOS, Android)

| Item | Where sold | Type | Price | Internal key | What it unlocks |
|---|---|---|---|---|---|
| Free | — | default plan | $0 | `plan='free'` | 5 transformations/month, 5 saved recipes*, shopping list, all 7 diet styles |
| **Plus** | Web only (Stripe Checkout) | monthly auto-renew subscription | $14.99/mo | `plan='wellness'` · env `STRIPE_WELLNESS_PRICE_ID` | 50 transformations/month, 50 saved recipes*, PDF cookbook download |
| **Premium** | Web only (Stripe Checkout) | monthly auto-renew subscription | $24.99/mo | `plan='family'` · env `STRIPE_FAMILY_PRICE_ID` | 150 transformations/month, 150 saved recipes*, PDF cookbook download, "priority support" |
| Agent API (`/api/agent/transform`, `/api/agent/transform-image`) | Machine-to-machine HTTP only | pay-per-call in USDC via x402 ($0.10/call) | — | — | Not reachable from the app, no UI, not tied to accounts |

\* The "save up to N recipes" limits are **advertised but not enforced** anywhere in
code (`handleSaveRecipe` has no count check). PDF cookbook gating is in
`SavedRecipesScreen.jsx` and is currently **bypassed for everyone until 2026-08-01**
(`cookbookTestingWindowOpen`), a date already in the past, so the gate is live again.

There are **no** consumable credits, no one-time purchases, no credit packs, no
"recipe upgrade" products. Android is a Trusted Web Activity of the website
(`twa/`), has no Play Billing, and hides all pricing UI via `isTWA`.

### A2. What Apple meant by "Recipe Upgrades"

"Recipe Upgrade" is the app's **marketing name for one recipe transformation** —
the metered unit. The native app shows the free quota as "5 of 5 Recipe Upgrades
Remaining This Month" (`HomeScreen.jsx`) and, at the limit, the `UpgradeModal`
("You've Used All 5 Recipe Upgrades… come back next month"). The in-app Terms and
About screen also reference Plus/Premium plans. The reviewer therefore saw a
metered digital feature whose only way to get more is a web subscription.

**Conclusion:** "Recipe Upgrades" are **not a separate product**. They are the
subscription entitlement (quota). The correct Apple IAP type is **auto-renewable
subscription** (Plus, Premium). No consumable/non-consumable product is needed.
Nothing is being hidden: the x402 agent API is a developer API with no in-app
surface and is not a digital good sold "within the app" (3.1.1 does not apply).

Optional (Kim's call, not required): the word "Upgrade" is used for both the metered
unit and the plan upsell button. Renaming the unit to "Recipe Transformations" in UI
would remove that ambiguity; Terms/Privacy already use "recipe transformations".

### A3. Entitlement architecture today

- **Source of truth:** `public.profiles.plan` (text: `free` | `wellness` | `family`),
  plus `swaps_used`, `swaps_month`. Trigger `protect_profile_plan` (migrations 004/005)
  rejects any client change to `plan`; only the service role / dashboard can write it.
- **Granting:** `api/webhook.js` on `checkout.session.completed` (needs
  `client_reference_id` = Supabase user id, `metadata.plan`), and idempotently
  `api/verify-session.js` on the `/success` return. Both set `plan` and reset `swaps_used=0`.
- **Revoking:** `customer.subscription.deleted` → looks the user up **by email** via
  `auth.admin.listUsers()` → `plan='free'` unconditionally. `customer.subscription.updated`
  and `invoice.payment_failed` are logged only (plan changes made in Stripe's portal are
  not reflected; there is no customer portal link in the app).
- **Client gates:** `PLAN_LIMITS = { free: 5, wellness: 50, family: 150 }` in `App.jsx`
  (plus `INTERNAL_LIMITS` for one email). The monthly counter resets client-side in
  `loadProfile`. PDF gate: `plan === 'wellness' || 'family'`. No Stripe customer id,
  subscription id, or expiry is stored in Supabase.
- **Account deletion** (`api/delete-account.js`) cancels active Stripe subscriptions by
  email, then deletes the user. The Delete modal says "Any active subscription
  (cancelled automatically)" — this will be **false for Apple subscriptions**, which only
  the user can cancel.
- **Auth:** Supabase PKCE; native deep link `old2new://auth/callback`; `decideAuthAction`
  rules (tested). Untouched by this plan.

### A4. iOS stack

| Item | Value |
|---|---|
| Capacitor | `@capacitor/core` 8.5.0, `@capacitor/ios` 8.5.0, CLI 8.5.0 (SPM, no CocoaPods) |
| Plugins | `@capacitor/app` 8.1.1, `@capacitor/browser` 8.0.4 |
| Xcode / macOS | Xcode 26.6 (17F113), macOS 26.6.2, Node 24.20 |
| Deployment target | iOS 15.0 (StoreKit 2 minimum is iOS 15 ✓) |
| Bundle / team | `app.old2new.ios`, team `Y4S56V3D4V`, `TARGETED_DEVICE_FAMILY = 1,2` |
| Version | `MARKETING_VERSION 1.0`, `CURRENT_PROJECT_VERSION 6` |
| StoreKit today | None. No `.storekit` config, no shared scheme, no entitlements file (IAP needs none) |
| Native API origin | `apiUrl()` hardcodes `https://old2new.app` for native; no dev override |
| Simulators | iPhone 17 Pro Max, iPad Air 11-inch (M4), iPad Pro 11-inch (M5) etc. available |

### A5. Health / nutrition content inventory

Where health or nutrition information appears **in the native app**:

| Surface | File | Content | Existing disclaimer? |
|---|---|---|---|
| Onboarding | `OnboardingScreen.jsx` | "What's your health goal?" + 7 goal chips (GLP-1 Friendly, Keto, Mediterranean, High Protein, Low Sugar, Low Calorie, Diabetic Friendly) | no |
| Home | `HomeScreen.jsx` | same 7 chips; free-text "Health Goal" with placeholder "Anti-Inflammatory… Heart Healthy" | footer line only |
| Results | `ResultsScreen.jsx` | before/after calories, "cal saved (%)", macros (protein/carbs/fat/fiber) bars, swap "reasons", AI "Why These Swaps" text, encouragement | badge "Nutritional information is estimated…" + footer |
| Saved / recent cards | `SavedRecipesScreen.jsx`, `HomeScreen.jsx` | "N cal" | no |
| What Sounds Good | `WhatSoundsGoodScreen.jsx` + `api/suggest.js` | AI meal ideas with "~N cal", protein, descriptions | no |
| Shopping list | `ShoppingListScreen.jsx` | none | footer |
| PDF cookbook | `CookbookPDF.jsx` | calories + macros per recipe | footer line + cover line |
| Homepage demo recipes (quick view) | `src/data/publicRecipes.js` via `RecipeQuickViewModal` + `RecipeResultTabs` | 4 static recipes incl. titles "Insulin-Friendly …", "Anti-Inflammatory …", and `whyTheseSwaps` text with medical-sounding claims | badges |
| About (in-app) | `AboutScreen.jsx` | "managing a GLP-1 medication like Ozempic or Wegovy", Supported Diets list, "No Nuts — Nut-allergy safe", Health Disclaimer section | yes (section) |
| First-run popup | `DisclaimerPopup.jsx` | medical notice | yes |
| Share screen (public) | `RecipeShareScreen.jsx` | same as results | badge |
| Blog ("Knowledge Library") | `src/blog/posts/*.md` | web only; stripped from the native bundle and no in-app link (build-4 fix) | per-post notes, no citations |

**Nutrition values: where they come from.** Every calorie/macro number in the app is
produced by the language model inside the transform / suggest responses
(`caloriesBefore`, `caloriesAfter`, `macros.before/after` in `api/transform.js`
SYSTEM_PROMPT; `calories`, `protein` in `api/suggest.js`). There is **no nutrition
database lookup, no serving-size arithmetic, and no rounding step in code**. The model
is told nothing about per-serving vs per-recipe or about data sources. The public
demo recipes are copies of earlier model outputs. So: the values are **AI estimates**
of typical per-serving composition, not calculated or measured. The UI labels them
"estimated" in some places (`RecipeResultTabs`: "BEFORE (cal, est.)") and not in others
(`ResultsScreen`: "BEFORE (cal)", "↓ N cal saved (N%)", cards "N cal").

**Claims that need rewriting or removal** (exact locations):

1. `publicRecipes.js` recipe 1 `whyTheseSwaps`: "zero-glycemic monk fruit or erythritol
   **eliminates the blood sugar spike**"; ingredient note "**zero glycemic impact**";
   "almond flour … **slow glucose absorption**"; title/goal "Insulin-Friendly".
2. `publicRecipes.js` recipe 2 `whyTheseSwaps`: "apple cider vinegar which **research
   suggests may help reduce post-meal blood sugar spikes**"; "amplifying the
   **insulin-friendly power** of the spice blend"; summary "**managing insulin
   resistance** … genuinely working with your body".
3. `publicRecipes.js` recipe 4: "ingredients that **actively work to calm inflammation**";
   "capsaicin — a compound with **well-documented anti-inflammatory effects**";
   "**nature's anti-inflammatory pharmacy**".
4. `AboutScreen.jsx` PREF_OPTIONS: "No Nuts — **Nut-allergy safe**" (a safety guarantee
   the app cannot make).
5. `AboutScreen.jsx` intro: "Whether you're **managing a GLP-1 medication** like Ozempic
   or Wegovy…" (implies medication management).
6. `ResultsScreen.jsx`: "↓ N cal saved (N%)" and "+N cal (more protein)" and "BEFORE (cal)"
   with no "estimated" marker; the calorie headline reads as a measurement.
7. `api/transform.js` / `api/suggest.js` / `api/sync-recipe.js` prompts: no rule
   against treatment/prevention/"safe for" language, so live output can contain any of
   the phrases above. (System prompt only asks for a consult-your-doctor reminder.)
8. `DisclaimerPopup.jsx` / About / footers: wording differs from the required disclaimer
   text; none mention that values are estimates **and** how they are produced.
9. Blog posts (web only): `diabetic-friendly-comfort-food`, `glp1-friendly-cooking`,
   `mediterranean-comfort-food`, `how-to-read-a-nutrition-label` (states Daily Values:
   fiber 28 g, added sugar 50 g — correct per FDA, uncited), `healthy-ingredient-swaps`
   ("blood sugar management"), `understanding-portion-balance`, `simple-ways-to-add-more-protein`.
   Not in the iOS binary, so not required for this rejection; recommended follow-up.
10. App Store metadata (`docs/app-store-connect-checklist.md` description): "heart-healthy"
    as a diet style (not an in-app option) and "Browse … a library of healthy-cooking
    guides" (the blog, which the native app does not expose). Recommend removing both
    phrases from the listing to keep metadata consistent with the binary.

**The four goal names** (Diabetic Friendly, GLP-1 Friendly, Mediterranean, High Protein)
do **not** need renaming. "Friendly" describes a recipe characteristic, not a medical
outcome, provided each goal has a visible definition ("what this means") and sources.
Nothing in 1.4.1 requires renaming them.

### A6. Apple rules reviewed (current text, fetched 2026-10-08)

- **3.1.1** — digital features/subscriptions must be unlocked with IAP; apps "may not use
  their own mechanisms". A restore mechanism is required. **3.1.1(a)**: on the **United
  States storefront** apps may include buttons/links/calls-to-action to external purchase
  without any entitlement (Epic injunction; Apple's contempt appeal is pending at the
  Supreme Court, which on 2026-05-06 declined to pause the zero-commission remedy). In
  **every other storefront** such links are prohibited unless using the StoreKit External
  Purchase Link Entitlement in the specific regions where it exists.
- **3.1.2(a)** ongoing value, ≥7 days, works on all the user's devices; **(b)** seamless
  upgrade/downgrade and no accidental duplicate subscriptions → one subscription group;
  **(c)** clearly describe what the user gets for the price before purchase, and meet
  Schedule 2 disclosure requirements (title, length, price, auto-renew terms, Terms of
  Use + Privacy Policy links).
- **3.1.3** — apps using other purchase methods "cannot, within the app, encourage users
  to use a purchasing method other than in-app purchase, except for apps on the United
  States storefront". **3.1.3(b) Multiplatform Services**: users may access
  subscriptions/features acquired on the web **provided those items are also available
  as in-app purchases**. → Existing Stripe subscribers may sign in and use Plus/Premium
  once Plus/Premium exist as IAPs.
- **1.4.1** — apps must "clearly disclose data and methodology to support accuracy claims
  relating to health measurements" and "remind users to check with a doctor".
- **StoreKit** — StoreKit 2 (iOS 15+) returns JWS-signed transactions; Apple's
  `@apple/app-store-server-library` (Node 3.1.0) verifies JWS transactions and App Store
  Server Notifications V2 using only Apple's public root certificates. The In-App Purchase
  **.p8 key is required only for the App Store Server API** (querying subscription status
  / history), not for verifying signed transactions or notifications.

---

## Part B — Implementation plan (awaiting approval)

### B1. Product inventory and naming map

| Customer-facing | Apple product ID (proposed) | Apple reference name | Stripe env | Supabase `profiles.plan` |
|---|---|---|---|---|
| Old2New Plus — $14.99/month | `app.old2new.ios.plus.monthly` | Old2New Plus Monthly | `STRIPE_WELLNESS_PRICE_ID` | `wellness` (unchanged) |
| Old2New Premium — $24.99/month | `app.old2new.ios.premium.monthly` | Old2New Premium Monthly | `STRIPE_FAMILY_PRICE_ID` | `family` (unchanged) |

Subscription group (one group, so a user can never hold both): reference name
**`Old2New Membership`**; ranking Premium = level 1 (higher), Plus = level 2. Switching
Plus→Premium is an upgrade (immediate, prorated by Apple); Premium→Plus is a downgrade
(takes effect at next renewal) — standard Apple behaviour, no app code required beyond
reacting to transaction updates.

Product IDs live in one place: `src/iap/products.js` (client) re-exported by
`api/_lib/appleProducts.js` (server), mapping `productId → plan`. No existing Stripe IDs,
enum values, or data are renamed. No separate IAP for "Recipe Upgrades" (see A2).

### B2. Architecture comparison

| | A. `@capgo/native-purchases` + Apple server library (recommended) | B. Hand-written Swift StoreKit 2 plugin + Apple server library | C. RevenueCat |
|---|---|---|---|
| Client | Open-source Capacitor plugin (MPL-2.0, v8.8.3, Capacitor 8 peer dep, updated 2026-10-07). StoreKit 2: `getProducts`, `purchaseProduct({appAccountToken})`, `restorePurchases` (`AppStore.sync`), `getPurchases({onlyCurrentEntitlements})`, `transactionUpdated` listener, `jwsRepresentation` on every transaction, manual `finishTransaction`, `manageSubscriptions`, `getStorefront` | ~300 lines Swift in `ios/App/App`, registered via a `CAPBridgeViewController` subclass. Same StoreKit 2 calls, no dependency | `@revenuecat/purchases-capacitor` 13.7.2 + RevenueCat account/dashboard |
| Backend changes | Two Vercel functions (`/api/apple/verify`, `/api/apple/notifications`), one migration, small Stripe-webhook guard | identical | RevenueCat webhooks → Supabase; RevenueCat becomes a second entitlement authority alongside Stripe; still need our own mapping code |
| Verification | JWS verified server-side with Apple root certs (no key needed); entitlement written with service role; client never sets `plan` | identical | RevenueCat verifies; we trust their webhook/REST |
| Stripe ↔ Apple reconciliation | Written by us, explicit (B4) | identical | RevenueCat can ingest Stripe too, but that means moving Stripe entitlement logic out of the current working webhook — a larger change than asked |
| Maintenance | Plugin tracks Capacitor majors; wrapper isolates it (`src/iap/`) | We own Swift + Xcode churn | SDK + dashboard + their pricing (free to $2.5k MTR, then 1%); another vendor in privacy label |
| Cost / deps | $0, one npm dep | $0, no dep | $0 now, paid later, new third-party processor |
| Risk | Plugin bug (mitigated: pin version, thin wrapper, tests) | More code to get right first time; cannot lean on community testing | Vendor lock-in, Kim asked not to add paid deps without approval |

**Recommendation: A.** It is the least code, uses Apple's own verification library,
keeps Supabase as the single entitlement authority, and the wrapper means B remains a
drop-in fallback. Android is a TWA, so the plugin's Android side is unused.

### B3. Client implementation (iOS native only; web and Android unchanged)

1. **Platform flag.** Add `isIOSNative()` (Capacitor platform === 'ios'). Keep `isTWA`
   semantics for Android. All new purchase UI is gated on `isIOSNative`; Android keeps
   hiding pricing exactly as today.
2. **`src/iap/`** — `products.js` (IDs/plans), `store.js` wrapper around the plugin:
   `loadProducts()`, `purchase(plan, userId)` (sets `appAccountToken = user.id`, which is
   already a UUID), `restore()`, `syncEntitlements()` (collects latest JWS per
   subscription → POST `/api/apple/verify` → returns server plan → `loadProfile`),
   `transactionUpdated` listener (handles renewals, upgrades/downgrades, Ask-to-Buy
   approvals, revocations while the app is open) and `manageSubscriptions()`.
   Transactions are **finished only after the server has verified and recorded them**
   (`autoFinishTransactions:false`); unfinished transactions are re-delivered by StoreKit
   on next launch, which is how pending/interrupted purchases recover.
3. **Launch / session restoration.** After sign-in and on app resume, `syncEntitlements()`
   runs. The plan shown always comes from `profiles.plan` (server-written). A device with
   an active Apple subscription but a signed-out or different account is handled: the
   purchase is attached to whichever account is signed in when verified, and the server
   refuses a JWS whose `appAccountToken` belongs to another user (prevents entitlement
   sharing).
4. **Paywall.** `PricingScreen` on iOS: products and localized prices from StoreKit,
   "Subscribe" buttons → purchase; "Restore Purchases" button; "Manage Subscription"
   (Apple sheet) when subscribed; required disclosure block (plan name, 1-month term,
   price/month, auto-renews until cancelled in App Store settings, links to Terms of Use
   and Privacy Policy opened in the system browser); remove "Billed monthly via Stripe"
   / "Apple Pay via Stripe" copy on iOS. Current plan badge works for web-purchased
   plans too ("Active · purchased on old2new.app" — plain text, no link, no price
   comparison). Loading, cancelled (`userCancelled`), failed, and pending (Ask to Buy)
   states each get explicit UI.
5. **Entry points on iOS:** Pricing tab restored in `BottomNav`; "Upgrade" buttons on
   Home; `UpgradeModal` offers Plus/Premium via Apple + "See all plans" + "Restore";
   `SavedRecipesScreen` PDF gate shows the upgrade path; `AboutScreen` gets a
   **Subscription** section (current plan, source, Restore Purchases, Manage).
6. **Account deletion copy.** Delete modal: Apple subscriptions must be cancelled by the
   user in Settings → Apple Account → Subscriptions; deletion does not cancel them. Server
   keeps cancelling Stripe subs as today.
7. **Terms / Privacy pages** (`public/terms.html`, `public/privacy.html`): add an Apple
   paragraph (billing through Apple ID, cancellation in App Store settings, refunds via
   Apple, "Recipe transformations" quota wording unchanged). Bump "Last updated".
8. **Anti-steering:** no "cheaper on the web" messaging anywhere; no links to Stripe
   checkout on iOS. Even though the US storefront would allow it, the app is distributed
   worldwide and Kim asked for the safest default.

### B4. Server implementation (Vercel functions, Node)

1. **`supabase/migrations/006_apple_subscriptions.sql`**
   - `profiles.entitlement_source text` (`'stripe' | 'apple' | null`), backfilled to
     `'stripe'` for current paid rows (cosmetic-free: `plan` values untouched).
   - New table `apple_subscriptions(original_transaction_id pk, user_id, product_id,
     plan, status, expires_at, environment, app_account_token, last_transaction_id,
     last_notification_type, updated_at)` with RLS: owner `select` only; all writes via
     service role.
2. **`api/apple/verify.js`** (POST, `Authorization: Bearer <Supabase access token>`,
   body `{ jws }`): validates the user, verifies the JWS with `SignedDataVerifier`
   (bundle `app.old2new.ios`, environment from the payload, Apple root CAs committed under
   `api/_lib/apple-roots/` — public certificates), checks product id ∈ config,
   `appAccountToken` ∈ {null, user.id}, revocation, expiry; upserts `apple_subscriptions`;
   applies the entitlement rule below; returns `{ plan, expiresAt, source }`.
3. **`api/apple/notifications.js`** (POST, App Store Server Notifications V2; sandbox and
   production URLs both point here, environment read from the signed payload): verifies
   `signedPayload`, decodes `signedTransactionInfo` / `signedRenewalInfo`, finds the user by
   `original_transaction_id` or `appAccountToken`, and handles `SUBSCRIBED`, `DID_RENEW`,
   `DID_CHANGE_RENEWAL_PREF` (upgrade/downgrade), `DID_CHANGE_RENEWAL_STATUS`,
   `DID_FAIL_TO_RENEW` (+grace period), `EXPIRED`, `GRACE_PERIOD_EXPIRED`, `REFUND`,
   `REVOKE`, `TEST`. Always 200 after recording; idempotent.
4. **Entitlement rule** (`api/_lib/entitlement.js`, unit-tested):
   - Apple grant → `plan = applePlan`, `entitlement_source='apple'`, reset
     `swaps_used=0` on a *new* subscription or upgrade (mirrors Stripe behaviour; renewals
     do not reset — the monthly reset in `loadProfile` already handles that).
   - Apple expiry/refund/revoke → if the user also has an active Stripe subscription
     (checked by email, same lookup `delete-account.js` already uses) set the Stripe plan
     and `source='stripe'`; else `plan='free'`.
   - Stripe `customer.subscription.deleted` → downgrade **only if** no active row in
     `apple_subscriptions`; otherwise keep the Apple plan. `checkout.session.completed` /
     `verify-session` set `source='stripe'`.
   - Both active → higher tier wins. Never writes `plan` from the client.
5. **No .p8 key needed for the above.** The App Store Server API (`getAllSubscriptionStatuses`)
   is an optional hardening for periodic reconciliation; if Kim provides the key, it is
   read from `APPLE_IAP_KEY_P8` / `APPLE_IAP_KEY_ID` / `APPLE_IAP_ISSUER_ID` env vars and
   never committed. Until then that reconciliation path is marked **BLOCKED**, not done.
6. **Local-testing support:** `LOCAL_TESTING` environment in the verifier accepts the
   Xcode StoreKit test certificate (exported from Xcode, kept out of git) so local
   StoreKit purchases can be verified end to end against `server/index.js`. A
   `VITE_API_ORIGIN` dev override lets a debug iOS build talk to the Mac's local server.
   Production verifier never accepts the test certificate.

### B5. Health / nutrition compliance

1. **Source registry** `src/data/healthSources.js`: each entry = `{ id, org, title, url,
   topics[], accessed }`. Topics: `diabetic-friendly`, `glp1-friendly`, `mediterranean`,
   `high-protein`, `keto`, `low-sugar`, `low-calorie`, `fiber`, `sodium`, `added-sugar`,
   `saturated-fat`, `portions`, `allergens`, `nutrition-estimates`, `sweeteners`.
   Every URL is checked by an automated link test (`__tests__/healthSources.test.js` does
   a HEAD/GET for each; failures block the build). Candidate sources (to be verified):
   - USDA FoodData Central — https://fdc.nal.usda.gov/
   - USDA/HHS Dietary Guidelines for Americans 2020–2025 — https://www.dietaryguidelines.gov/
   - FDA Daily Value on the Nutrition Facts label — https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels
   - FDA Added Sugars — https://www.fda.gov/food/nutrition-facts-label/added-sugars-nutrition-facts-label
   - FDA Sodium in Your Diet — https://www.fda.gov/food/nutrition-education-resources-materials/sodium-your-diet
   - FDA Food Allergies — https://www.fda.gov/food/food-labeling-nutrition/food-allergies
   - FDA sweeteners (incl. monk fruit, erythritol) — https://www.fda.gov/food/food-additives-petitions/aspartame-and-other-sweeteners-food
   - FDA 21 CFR 101.9 (nutrition labeling, rounding) — https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.9
   - NIH NIDDK Diabetes Diet, Eating & Physical Activity — https://www.niddk.nih.gov/health-information/diabetes/overview/diet-eating-physical-activity
   - CDC Diabetes Meal Planning — https://www.cdc.gov/diabetes/healthy-eating/diabetes-meal-planning.html
   - CDC Fiber: The Carb That Helps You Manage Diabetes — https://www.cdc.gov/diabetes/healthy-eating/fiber-helps-diabetes.html
   - American Diabetes Association, Glycemic Index and Diabetes — https://diabetes.org/food-nutrition/understanding-carbs/glycemic-index-and-diabetes
   - American Diabetes Association, Standards of Care in Diabetes—2025, Section 5 (nutrition therapy) — https://diabetesjournals.org/care/issue/48/Supplement_1
   - NIH NIDDK Prescription Medications to Treat Overweight & Obesity (GLP-1 agonists) — https://www.niddk.nih.gov/health-information/weight-management/prescription-medications-treat-overweight-obesity
   - FDA, Medications Containing Semaglutide — https://www.fda.gov/drugs/postmarket-drug-safety-information-patients-and-providers/medications-containing-semaglutide-marketed-type-2-diabetes-or-weight-loss
   - American Heart Association, Mediterranean Diet — https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/nutrition-basics/mediterranean-diet
   - Estruch R. et al., PREDIMED, NEJM 2018 — https://www.nejm.org/doi/full/10.1056/NEJMoa1800389
   - American Heart Association, Saturated Fat — https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/saturated-fats
   - NASEM Dietary Reference Intakes (protein, fiber) — https://nap.nationalacademies.org/catalog/10490
   - Paddon-Jones D. et al., Protein, weight management, and satiety, AJCN 2008 — https://doi.org/10.1093/ajcn/87.5.1558S
   - NIH NCBI StatPearls, Ketogenic Diet — https://www.ncbi.nlm.nih.gov/books/NBK499830/
   - NIH NIDDK, Healthy Eating & Physical Activity for Weight — https://www.niddk.nih.gov/health-information/weight-management/adult-overweight-obesity/eating-physical-activity
   - USDA MyPlate — https://www.myplate.gov/
2. **Contextual "Sources" control** `src/components/shared/SourcesLink.jsx` → bottom
   sheet listing the sources for the given topics, each a working link (opened with
   `@capacitor/browser` natively, new tab on web), plus the disclaimer and "View all
   references". Placed at: goal chips on Home and Onboarding ("What these goals mean ·
   Sources" with a one-line neutral definition per goal), Results calorie card and Macros
   tab ("How we estimate nutrition"), "Why These Swaps" box, What Sounds Good header,
   About → Supported Diets, public quick-view/share tabs, and the PDF (methodology +
   references page at the end).
3. **Central `ReferencesScreen`** (in-app route `references`, and `/references` on web):
   full list grouped by topic, nutrition methodology, disclaimer. Linked from About,
   from every Sources sheet, and from the first-run disclaimer.
4. **Nutrition methodology text** (shown in the Macros tab sheet, References, PDF):
   values are estimates generated by the AI model from typical ingredient composition
   (reference: USDA FoodData Central), per serving as stated in the recipe, rounded to
   whole calories and whole grams; they are not laboratory measurements, do not account
   for brand differences, cooking losses, or exact portioning, and can differ materially
   from actual values. Prompt is updated to state per-serving basis and rounding so the
   methodology text is true.
5. **Disclaimer** (Kim's exact text) in `DisclaimerPopup` (first run), About, References,
   every Sources sheet, the paywall footer, and the PDF cover. Short footer lines stay.
6. **Claim language:** prompts for transform/suggest/sync get an explicit rule set
   (describe recipe characteristics; never "safe for", "controls/lowers blood sugar",
   "treats", "prevents", "cures", "recommended for everyone on GLP-1 medication";
   no dosage/medication advice). A deterministic claim check on text fields
   (`api/claimGuard.js`, tested) triggers one Haiku rewrite of just those fields when a
   banned pattern appears, reusing the existing repair pattern. Static copy edited as
   listed in A5 items 1–6 (exact replacement wording included in the PR). Result screen
   labels all values "est."
7. **Blog posts** (web only): out of scope for this rejection; proposed as a follow-up
   PR adding a Sources section to the seven health posts.

### B6. Local StoreKit testing (before App Store Connect is ready)

- `ios/App/App/Old2New.storekit` with group `Old2New Membership`, both products, and a
  shared scheme `App.xcscheme` that enables it for Run.
- Tests driven on the iPhone 17 Pro Max and iPad Air 11-inch simulators: Plus purchase,
  Premium purchase, Restore, Plus→Premium upgrade, Premium→Plus downgrade, cancel at
  the sheet, renewal/expiry via accelerated renewal rate and Transaction Manager
  (expire, refund), Ask-to-Buy pending → approve, free-user state, web-subscriber state
  (profile seeded with `wellness`/`stripe`), signed-out state. Results reported as
  **LOCAL STOREKIT TEST PASSED/FAILED** only. Sandbox/TestFlight is reported separately
  and only after Kim finishes App Store Connect (B7).

### B7. What Kim must do in App Store Connect (exact values)

1. **Agreements, Tax, and Banking** → Paid Apps agreement active; tax forms and bank
   account complete. Without this, products never load in Sandbox.
2. **My Apps → Old2New → Subscriptions → Create Subscription Group**: reference name
   `Old2New Membership`; App Store localization (English): display name `Old2New Membership`.
3. **Add subscription 1**: reference name `Old2New Plus Monthly`, product ID
   `app.old2new.ios.plus.monthly`, duration 1 month, price $14.99 (USD, let Apple
   generate other territories), availability all, localization display name
   `Old2New Plus`, description `50 recipe transformations per month, save up to 50
   recipes, PDF cookbook.`; review screenshot (I will supply from the local build); review
   notes.
4. **Add subscription 2**: `Old2New Premium Monthly`, `app.old2new.ios.premium.monthly`,
   1 month, $24.99, display name `Old2New Premium`, description `150 recipe
   transformations per month, save up to 150 recipes, PDF cookbook, priority support.`
5. **Group ranking**: Premium level 1, Plus level 2.
6. **App Information → License Agreement**: either Apple's standard EULA or custom
   (Terms URL https://old2new.app/terms.html). Privacy Policy URL already set.
7. **App Information → App Store Server Notifications**: Production URL
   `https://old2new.app/api/apple/notifications`, Sandbox URL the same; version 2.
8. **Users and Access → Sandbox → Testers**: create at least one Sandbox Apple Account
   and sign into it on the test device (Settings → App Store → Sandbox Account).
9. **Optional (recommended): Users and Access → Integrations → In-App Purchase → generate
   key**; send me the .p8, Key ID, Issuer ID **out of band** → set as Vercel env vars
   `APPLE_IAP_KEY_P8`, `APPLE_IAP_KEY_ID`, `APPLE_IAP_ISSUER_ID`. Never in git.
10. **Version 1.0 page → In-App Purchases and Subscriptions**: attach both subscriptions
    to the submission (first IAPs must be submitted with a binary).
11. **Vercel env**: nothing new required for the base path (`SUPABASE_URL`,
    `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` already exist). Run migration 006 in
    the Supabase SQL editor (I will provide the file; Kim runs it, as with 001–005).
12. **For my local end-to-end test**: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in the
    local `.env` (gitignored). Without them, local testing covers the client flow and
    JWS verification with a mocked database, and I will say so.

### B8. Build, QA, and submission

- Bump `CURRENT_PROJECT_VERSION` 6 → 7, marketing version stays 1.0.
- Automated: existing 102 tests + new tests (entitlement rule, claim guard, source link
  check, product config, verify/notification handlers with recorded JWS fixtures).
- Manual iOS QA on iPhone 17 Pro Max and iPad Air 11-inch simulators (and a physical
  device if available): full list from the brief, including auth callback, sign-out,
  account deletion, all four goals, What Sounds Good, save, PDF, paywall, purchase,
  restore, expiry, failed purchase, web-subscriber login, Sources links.
- Nothing is uploaded or submitted without Kim's explicit go.

### B9. Decisions needed from Kim

1. Approve architecture **A** (`@capgo/native-purchases`, free/open-source) — or choose B/C.
2. Approve product IDs `app.old2new.ios.plus.monthly` / `app.old2new.ios.premium.monthly`
   and group `Old2New Membership`.
3. Confirm "Recipe Upgrades" = subscription quota, no separate product (A2).
4. Web-subscriber wording on iOS: show "Purchased on old2new.app" as plain text with no
   link (my recommendation), or show nothing.
5. Optional rename of the metered unit to "Recipe Transformations" (A2) — yes/no.
6. Approve the static copy rewrites in A5 items 1–6 (exact wording will be in the PR
   diff for review) and the App Store description edits in A5 item 10.
7. Whether to provide the In-App Purchase .p8 key now (enables server-side status
   reconciliation) or defer.
