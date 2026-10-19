# Google Play Billing — live verification log (2026-10-19)

Environment: AVD "Old2New PlayTest" (Android 17 Google Play image), app build
1.2.1 (versionCode 10) — the same build published on the Internal testing
track — signed-in Old2New account kim@storefrontsignal.com (license tester),
production site old2new.app (deploy `old2new-5b0ks9vqz`, branch
`deploy/google-play-billing`, commit b248abf), production Supabase.
Test subscriptions renew every 5 minutes; "Test card, always approves" unless
noted. No money moved.

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | Digital Goods `getDetails` inside the TWA | both products, live USD 14.99 / 24.99, P1M | DevTools eval |
| 2 | Free account | home shows "5 of 5", Pricing shows both plans + Google disclosures, Restore Purchases, no Stripe | page text |
| 3 | Buy Plus from the app | Play sheet "Old2New Plus $14.99", "You're now on Plus", home "50 of 50" | `/api/google/verify` 200, profiles.plan=wellness/google, swaps_used reset, row active+acknowledged |
| 4 | RTDN for the purchase | `SUBSCRIPTION_PURCHASED` reached `/api/google/notifications` 23 s before the device verified | logs 09:44:12 / 09:44:35 |
| 5 | Plus → Premium (chargeProratedPrice) | Play showed prorated $5.94 today, "You're now on Premium", home "150 of 150" | new row active linked to old token; old row non-granting |
| 6 | Premium → Plus (deferred) | "Your plan changes to Plus at your next renewal. Until then you keep Premium." Premium kept until renewal | row deferred_product_id=plus |
| 7 | Renewal | `SUBSCRIPTION_RENEWED` switched product to Plus, plan=wellness, home "50 of 50" | DB + logs 09:50:04 |
| 8 | Restore Purchases | "Restored: your Plus plan is active." | verify 200 |
| 9 | Payment failure (card → always declines) | `SUBSCRIPTION_IN_GRACE_PERIOD`: status inGracePeriod, plan kept (wellness) | DB 16:55:05Z |
| 10 | Account hold | `SUBSCRIPTION_ON_HOLD`: plan → free, home "5 of 5" | DB 17:00:01Z |
| 11 | Fix payment | `SUBSCRIPTION_RECOVERED`: active, plan → wellness, home "50 of 50" | DB 17:03:26Z |
| 12 | Cancel in Play | `SUBSCRIPTION_CANCELED`: status canceled, plan kept until period end | DB 17:06:18Z |
| 13 | Expiry | `SUBSCRIPTION_EXPIRED`: plan → free, home "5 of 5" | DB 17:08:58Z |
| 14 | Buy Premium directly from free | "You're now on Premium", home "150 of 150" | row active, plan=family/google |
| 15 | Dismiss the Play sheet (Back) on a switch | no change, Premium stays current, no error shown | page text |
| 16 | Uninstall, reinstall (fresh Chrome profile), Continue with Google | signed in, home "150 of 150" restored by the launch sync | page text |
| 17 | Other entitlement sources untouched | apple/family 1, manual/family 2, stripe/wellness 1 (unchanged) | profiles summary |

Not exercisable live: PENDING purchases (the Play test environment on this
account offers only "always approves", "always declines" and "approves then
charges back" instruments). Covered by unit tests (verify returns `pending`,
nothing granted, nothing acknowledged).

Known cosmetic follow-up: after a deferred downgrade, Google's final EXPIRED
payload lists both line items with the same expiry; `primaryLineItem` then
records the higher tier's product id on the (already expired, non-granting)
row. Entitlement is unaffected.
