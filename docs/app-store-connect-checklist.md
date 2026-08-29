# Old2New iOS — App Store Connect submission checklist

Companion to `ios-app-privacy-disclosure.md`. Everything below is either
prepared (✅), needs an Apple/Google account (🔑), or needs a person with the
phone or Mac (👤). Version 1.0 (build 1), bundle ID `app.old2new.ios`, team
`Y4S56V3D4V`.

## 1. Build & upload

| Item | Status |
|---|---|
| Release archive builds and exports for App Store Connect (`xcodebuild archive` + `-exportArchive`, automatic signing) | ✅ verified; IPA ≈ 34 MB |
| Bundle contents: real icon (no alpha), launch splash, `old2new` URL scheme, `ITSAppUsesNonExemptEncryption=false`, iPhone-only, portrait-only, production API origin, GA measurement ID | ✅ |
| Build command before archiving | `npm run ios:sync` (NOT plain `npm run build` — that re-bloats the bundle to 360 MB) |
| Create the app record in App Store Connect (My Apps → + → New App → iOS, name "Old2New", bundle ID `app.old2new.ios`, SKU `old2new-ios`) | 🔑 |
| Upload: Xcode → Product → Archive → Distribute App → App Store Connect → Upload (or share an App Store Connect API key and the exported IPA can be uploaded from the CLI) | 🔑 |
| Physical-device smoke test before upload | 👤 see §5 |

## 2. App information

| Field | Value |
|---|---|
| Name | Old2New |
| Subtitle (30 chars) | Healthier versions of your recipes |
| Primary category | Food & Drink |
| Secondary category | Health & Fitness |
| Privacy Policy URL | https://old2new.app/privacy.html |
| Support URL | https://old2new.app/contact |
| Marketing URL (optional) | https://old2new.app |
| Copyright | © 2026 Old2New |
| Content rights | Does not contain, show, or access third-party content (recipes are user-entered + AI-generated) |
| Age rating questionnaire | All "None" except **Medical/Treatment Information: Infrequent/Mild** (health-goal recipes). Expected rating: 4+ or 12+ |
| Sign-in required? | Yes for transforming/saving; the home page, recipes and blog are viewable signed-out |

## 3. Version information (1.0)

**Promotional text (170 chars)**
> Turn the comfort food you already love into a lighter version — same dish, same cuisine, just a little healthier. Free to start.

**Description**
> Old2New transforms your favorite comfort recipes into healthier versions you'll actually want to cook — keeping the dish and the cuisine you love, and swapping only what needs swapping.
>
> Paste or type any recipe, choose a diet style (Mediterranean, keto, GLP-1-friendly, heart-healthy and more), add your own dietary needs, and get back a complete transformed recipe with ingredient swaps explained, estimated calories before and after, and step-by-step instructions.
>
> • Works with the recipes you already have — no meal-plan lock-in
> • Preserves the original dish and cuisine
> • Ingredient-by-ingredient swaps with the reason for each
> • Dietary preferences remembered: vegan, gluten-free, dairy-free, no pork and more
> • Save recipes and build a shopping list
> • "What sounds good?" suggestions when you're not sure what to cook
> • Browse real transformations and a library of healthy-cooking guides
>
> Free plan includes 5 recipe transformations per month.
>
> Recipes are generated with AI and are for informational purposes only — always review ingredients, allergens and nutrition before cooking. Not medical advice.

**Keywords (100 chars)**
> healthy recipes,recipe converter,comfort food,GLP-1,keto,mediterranean,meal ideas,ingredient swaps

**What's New**
> First release.

**Screenshots** — required: 6.9" iPhone (1320×2868); ASC scales these for
smaller iPhones. Captured in `docs/app-store/` (all 1320×2868):

| Order | File | Notes |
|---|---|---|
| 1 | `iphone-6.9-01-home.png` | Signed-out home / hero |
| 2 | `iphone-6.9-02-transform.png` | Transform input with recipe + GLP-1 selected |
| 3 | `iphone-6.9-03-result.png` | Transformed result: photo, before/after calories |
| 4 | `iphone-6.9-05-suggest-ideas.png` | "What sounds good?" dinner ideas |
| 5 | `iphone-6.9-06-suggest-filters.png` | Suggestion filters (optional) |
| 6 | `iphone-6.9-04-saved.png` | Saved recipes — weakest; retake with 3–4 saved recipes that have photos before using |

Upload order suggestion: 3, 2, 4, 1, 5 (lead with the result).

## 4. App Privacy

Enter exactly the table in `docs/ios-app-privacy-disclosure.md` §2 (Email,
Name, Health, Other User Content, User ID, Product Interaction, Coarse
Location; nothing used for tracking). 🔑

Before publishing the label: GA4 Admin → Data Settings → Data Collection →
confirm **Google signals data collection** is OFF and **Ads personalization**
is off. 🔑 (Google account.) If either is on, either turn it off or update
the label's tracking answer.

## 5. App Review information

| Field | Value |
|---|---|
| Sign-in required | Yes — provide a confirmed test account (email + password) 🔑/👤 |
| Contact | First/last name, phone, email (admin@old2new.app) |
| Notes | see below |

**Review notes (paste as-is, fill the account):**
> Old2New transforms recipes into healthier versions using a third-party AI model (Anthropic); recipe images are AI-generated (OpenAI). This version has no in-app purchases; the free tier is fully usable. Account deletion is available in-app under About → Delete Account. Email confirmation and password-reset links return to the app via the old2new:// URL scheme. Test account: [email] / [password].

## 6. Physical-device smoke test (👤)

Connect an iPhone by USB, trust the Mac, select it in Xcode, Run. Then:

1. Cold launch → splash shows the leaf logo, home page nav clears the Dynamic Island.
2. Get Started → Sign Up with a fresh email → "Check your email" screen.
3. Open the email on the phone → tap link → "Open in Old2New?" → Open → lands signed in (onboarding).
4. Transform a recipe → result appears (proves the production API path from the app).
5. Save it → Saved tab → open → Share (link opens in Safari).
6. Sign out → Sign In with password → works. Forgot password → email → link opens app → reset works.
7. About → Delete Account → confirm → returns to home signed out.
8. Rotate the phone: stays portrait. Background/foreground the app: session persists.

## 7. Known non-blockers (leave for v1.1)

- Google Sign-In hidden on iOS (would require Sign in with Apple).
- Universal Links (https://old2new.app/auth/callback opening the app) not set up; custom scheme is used.
- Vercel build warnings (chunk size, npm install-scripts, deprecation notice) — informational.
