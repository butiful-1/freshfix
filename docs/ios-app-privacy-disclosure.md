# Old2New iOS — App Store Privacy Disclosure Plan

Scope: the Old2New iOS app (bundle `app.old2new.ios`, v1.0). The website privacy
policy at https://old2new.app/privacy.html remains the single master policy for
all platforms; this document maps the iOS app's *actual* data flows to Apple's
App Privacy ("nutrition label") categories and lists the small master-policy
edits needed so it accurately covers iOS.

Basis: code audit of the shipped iOS bundle (2026-08-29). Platform-specific
distribution settings for other stores are out of scope and untouched.

## 1. What the iOS app actually does with data

| Flow | Data | Where it goes | Stored? |
|---|---|---|---|
| Sign up / sign in (email + password) | Email, password (hashed by Supabase), Supabase user ID | Supabase Auth | Yes — account lifetime |
| Confirmation / reset emails | Email address | Supabase → Resend (SMTP) | Transient |
| Profile | Plan tier, monthly transform count, dietary preferences (e.g. vegan, gluten-free, no pork), marketing-email consent + timestamp | Supabase `profiles` | Yes |
| Recipe transform / "What sounds good" | Recipe text, selected diets, dietary preferences, free-text **health goal** (users may type conditions such as GLP-1, diabetes) | Vercel API → Anthropic Claude API. No account identity is sent. | Not stored server-side; result may be saved by the user |
| Recipe image | Text description of the transformed recipe | Vercel API → OpenAI Images; image stored in Supabase Storage | Yes (image file) |
| Saved recipes | Recipe content + user ID | Supabase `saved_recipes` | Yes |
| Share recipe | Saved recipe becomes readable at a public `/recipe/<id>` link | Public web | Yes, until deleted |
| Report a recipe | Recipe name/ID, user ID, comments, user-agent string | Supabase Storage (reports bucket) | Yes |
| Contact form (reachable from the app's home menu) | Name, email, subject, message | Vercel API → Resend → admin@old2new.app | In mailbox only |
| Analytics | Google Analytics 4 (`gtag.js`) loads in production builds, **including inside the iOS app**: page/screen views, interactions, device model/OS, coarse location derived from IP, GA client ID. No user ID is passed to GA. | Google | Google retention settings |
| Server logs | IP address, user agent, request path (hosting logs; short retention) | Vercel | Short-term |
| Account deletion | In-app (About → Delete Account) via `/api/delete-account`; cascades profile + saved recipes; cancels any active Stripe subscription | Supabase, Stripe | Removed |

Not present in the iOS app: in-app purchases (Stripe purchasing UI is hidden on
iOS; plan status from a web purchase is only *displayed*), Google Sign-In,
advertising SDKs, IDFA / device fingerprinting, crash-reporting SDKs, contacts,
photos, camera, location services, push notifications, health-app integration.

## 2. App Store Connect → App Privacy answers

**Do you collect data from this app?** Yes.

Definitions used (Apple's): *Linked to you* = associated with the user's
account/identity. *Used for tracking* = linked with third-party data for
advertising, or shared with a data broker. Nothing in Old2New is used for
tracking; do **not** add the App Tracking Transparency prompt.

| Apple data type | Collected? | Linked to user | Tracking | Purpose(s) | Source |
|---|---|---|---|---|---|
| **Contact Info → Email Address** | Yes | Yes | No | App Functionality, Customer Support | Account; contact form |
| **Contact Info → Name** | Yes | Yes | No | Customer Support | Contact form (optional field) |
| **Health & Fitness → Health** | Yes | Yes | No | App Functionality | Dietary preferences (stored) and free-text health goals sent to the AI provider |
| **User Content → Other User Content** | Yes | Yes | No | App Functionality | Recipes entered, saved recipes, recipe reports, contact messages |
| **Identifiers → User ID** | Yes | Yes | No | App Functionality | Supabase user ID |
| **Usage Data → Product Interaction** | Yes | Yes* | No | App Functionality, Analytics | Transform counts (linked); GA screen/interaction events (not linked) |
| **Location → Coarse Location** | Yes | No | No | Analytics | GA derives city-level location from IP |
| **Diagnostics** | No | — | — | — | No crash/performance SDK |
| **Purchases → Purchase History** | No | — | — | — | No purchasing on iOS; plan tier is account data, not a purchase record |
| **Financial Info** | No | — | — | — | Stripe is never used inside the iOS app |
| **Identifiers → Device ID** | No | — | — | — | No IDFA/IDFV use |
| Browsing History, Search History, Contacts, Photos/Videos, Audio, Sensitive Info, Fitness, Precise Location, Gameplay, Advertising Data, Other Data | No | — | — | — | — |

\* Apple's form asks for one answer per data type. Because transform counts are
tied to the account, answer "Linked to you: Yes" for Product Interaction — the
conservative and accurate choice even though GA events themselves are not linked.

Other App Store Connect fields:

- **Privacy Policy URL:** `https://old2new.app/privacy.html`
- **Privacy Choices URL:** leave blank (no separate choices page).
- **Support URL:** `https://old2new.app/contact`
- **Age rating:** answer the questionnaire from content only (no gambling,
  violence, mature themes; "Medical/Treatment Information: Infrequent/Mild"
  is reasonable given health-goal recipes). The policy's "not directed to
  children under 13" statement is compatible with a 4+ or 12+ rating.
- **Review notes:** state that AI-generated recipes come from a third-party
  model, that there are no in-app purchases in this version, and provide a
  test account. Mention the in-app Delete Account path (About → Delete
  Account).

Third-party processors to name if Apple or the label asks: Supabase (database,
auth, storage), Vercel (hosting/API), Anthropic (recipe AI), OpenAI (images),
Resend (email), Google (Analytics). Stripe is a web-only processor.

## 3. Google Analytics decision

GA4 runs inside the iOS WebView in production builds. Two compliant options:

1. **Keep GA (default)** — declare Product Interaction + Coarse Location for
   Analytics as above. Verify in the GA property that **Google Signals** and
   ads personalization are **off**; with them on, GA data could count as
   "tracking" under Apple's definition and as "sharing" under CPRA.
2. **Disable GA on native** — one-line gate in `src/main.jsx`
   (`if (import.meta.env.PROD && GA_ID && !isNativeApp())`). Removes the
   Analytics purpose, Coarse Location, and the Google Signals dependency
   from the label. Web analytics unchanged.

## 4. Master policy gaps to close (small edits only)

The website policy is accurate for iOS in substance. These additions keep it
literally true for both platforms; no restructuring or rewrite is needed.

1. **§2 Device & log data** — currently says "browser type … pages visited".
   Add: "When you use our mobile app, this includes your device model,
   operating system version and app screens viewed."
2. **§2 Recipe data** — add: "including any dietary preferences and health
   goals you enter (for example, a diet style or a condition you are cooking
   for). Health goals are sent to our AI provider to generate your recipe and
   are not shared with anyone else."
3. **§6 Sharing** — add two processors that already handle data today:
   "Resend — to deliver account emails, marketing emails you opt into, and
   messages you send us through the contact form" and "Vercel — to host the
   service; Vercel keeps short-term server logs including IP address."
4. **§9 / §10 Deletion** — currently "email us". Add: "You can also delete
   your account at any time from the About screen in the app; deletion takes
   effect immediately and removes your profile and saved recipes."
5. **New sentence under §2 or §5 — Shared recipes** — "If you use Share, the
   shared recipe becomes viewable by anyone with the link until you delete
   it."
6. **§8 Cookies & Local Storage** — add "and equivalent local storage inside
   our mobile apps" so the section covers the app's on-device session storage.
7. **§2 Usage data** — add "recipe reports you submit" to the list, since
   reports store your user ID and comments.
8. **Last updated** date — bump when the above is published.

Not needed: no Apple-specific clauses (Sign in with Apple, IAP, App Tracking
Transparency) are required because the app uses none of them; no
platform-specific policy pages; no change to subscription-tier language.

## 5. Checklist

- [ ] Decide GA option (§3) — default: keep and declare.
- [ ] If keeping GA: confirm Google Signals / ads personalization are off in the GA4 property.
- [ ] Enter the §2 table in App Store Connect → App Privacy.
- [ ] Set Privacy Policy URL and Support URL.
- [ ] Apply the eight policy edits in §4 and bump "Last updated".
- [ ] Add the third-party processor list and test account to App Review notes.
