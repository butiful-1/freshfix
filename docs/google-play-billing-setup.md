# Google Play Billing for the Old2New Android app — setup and runbook

The Android app (`app.old2new.twa`) is a Trusted Web Activity of old2new.app.
Google Play subscriptions are sold through Chrome's **Digital Goods API** and
**Payment Request API** (`https://play.google.com/billing`), bridged to Google
Play by the `com.google.androidbrowserhelper:billing` module (Play Billing
Library 8.3.0). Nothing in the Apple, Stripe or web flows changes.

## Architecture

| Layer | File | Role |
|---|---|---|
| Android | `twa/android/app/build.gradle`, `AndroidManifest.xml`, `DelegationService.java` | billing module, `PaymentActivity` / `PaymentService`, Digital Goods handler |
| Web client | `src/iap/googleStore.js`, `src/iap/googleProducts.js` | detect billing, live prices, purchase / switch, restore, manage |
| App shell | `src/App.jsx` (`storeIAP`), `PricingScreen.jsx`, `UpgradeModal.jsx`, `AboutScreen.jsx` | store-specific paywall copy, Restore Purchases, Google disclosures |
| Server | `api/google/verify.js` | device → server verification of purchase tokens (Bearer Supabase session) |
| Server | `api/google/notifications.js` | Real-time developer notifications (Pub/Sub push) |
| Server | `api/_lib/googlePlayClient.js`, `googleEntitlement.js`, `googleProducts.js`, `entitlement.js` | Play Developer API client, state → status, acknowledgement, 3-way entitlement precedence |
| Database | `supabase/migrations/007_google_subscriptions.sql` | `google_subscriptions` table, `entitlement_source = 'google'` |

Entitlement rule (unchanged shape): `profiles.plan` is only ever written by the
server. Highest active tier across Apple, Google Play and Stripe wins; on a tie
Apple, then Google, then Stripe. `entitlement_source = 'manual'` rows are never
touched. A PENDING Google purchase is recorded but grants nothing; it is only
acknowledged once it is paid and linked to an account.

## Products (must match `src/iap/googleProducts.js` / `api/_lib/googleProducts.js`)

| Product ID | Base plan ID | Name | Price (US) | Plan value |
|---|---|---|---|---|
| `old2new_plus_monthly` | `monthly` | Old2New Plus | $14.99 / month, auto-renewing | `wellness` |
| `old2new_premium_monthly` | `monthly` | Old2New Premium | $24.99 / month, auto-renewing | `family` |

## One-time setup

### 1. Play Console — subscriptions (Monetize → Products → Subscriptions)
The console only allows subscriptions once a build that declares
`com.android.vending.BILLING` has been uploaded — that is the 1.2 (versionCode 9)
bundle. Create both products above, each with one auto-renewing base plan
`monthly`, billing period 1 month, US price as listed, grace period and account
hold enabled (defaults), and **activate** the base plans and products.

### 2. Google Cloud — service account for purchase verification
1. Play Console → Settings → **API access** → link (or create) a Google Cloud project.
2. In that Cloud project enable the **Google Play Android Developer API** and
   create a **service account**; create a **JSON key** for it.
3. Play Console → Users and permissions → **Invite new users** → the service
   account's email → app permission for Old2New: *View app information* and
   *Manage orders and subscriptions* (financial data).
4. Vercel → old2new-app → Environment Variables (Production + Preview):
   - `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` = the whole JSON key file (raw or base64)
   - `GOOGLE_PLAY_RTDN_TOKEN` = a long random secret (shared with the push subscription below)
   - optional `GOOGLE_PLAY_PACKAGE_NAME` (defaults to `app.old2new.twa`)

### 3. Real-time developer notifications
1. Cloud project → Pub/Sub → create topic `old2new-play-rtdn`.
2. On the topic, grant **Pub/Sub Publisher** to
   `google-play-developer-notifications@system.gserviceaccount.com`.
3. Create a **push** subscription on the topic with endpoint
   `https://old2new.app/api/google/notifications?token=<GOOGLE_PLAY_RTDN_TOKEN>`.
4. Play Console → Monetize → Monetization setup → Real-time developer
   notifications → topic name `projects/<project-id>/topics/old2new-play-rtdn`
   → Save → **Send test notification** (the endpoint logs it and returns 200).

### 4. Supabase
Run `supabase/migrations/007_google_subscriptions.sql` in the SQL editor.

### 5. Deploy the web app
`vercel --prod` from `C:\Users\kim4n\swapeats` (the TWA loads old2new.app, so the
Android app only gains the purchase UI once the site is deployed).

## Testing (Google Play test environment)
- Play Console → Settings → **License testing** → add the tester Google account
  (e.g. the account signed in on the emulator). License testers are not charged
  and test subscriptions renew every 5 minutes, expire after 6 renewals.
- Install the internal-testing build from Play, or sideload the release APK
  signed with a key listed in `public/.well-known/assetlinks.json` and enable
  `chrome://flags/#enable-debug-for-store-billing` in Chrome on the device.
- Checklist: free account 5 saves → buy Plus ($14.99) → 50 → switch to Premium
  ($24.99, prorated, immediate) → 150 → switch back to Plus (at renewal) →
  cancel (access through period end) → expiry (free) → reinstall + sign in
  restores → Restore Purchases → cancel in purchase sheet (no access) →
  pending purchase (no access until paid).

## Lifecycle handling
| Google state / RTDN | Our status | Access |
|---|---|---|
| ACTIVE / PURCHASED, RENEWED, RECOVERED, RESTARTED | `active` | yes |
| CANCELED (auto-renew off, period not over) | `canceled` | yes, until `expires_at` |
| IN_GRACE_PERIOD | `inGracePeriod` | yes |
| ON_HOLD, PAUSED | `onHold` / `paused` | no |
| PENDING, PENDING_PURCHASE_CANCELED | `pending` / `pendingCanceled` | no |
| EXPIRED, REVOKED (refund) | `expired` / `revoked` | no |
| replaced by upgrade/downgrade (linkedPurchaseToken) | `replaced` | the new token decides |
