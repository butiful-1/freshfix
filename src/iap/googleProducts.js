// Single source of truth for Google Play subscription product identifiers
// (Android app, package app.old2new.twa).
//
// Customer-facing plan names are Plus and Premium. The existing Supabase /
// Stripe entitlement values are 'wellness' (Plus) and 'family' (Premium) and
// are NOT renamed — this file is the mapping between the two worlds. The
// server-side copy of this mapping lives in api/_lib/googleProducts.js and a
// unit test keeps the two in sync.
//
// Each product has exactly one base plan ('monthly', auto-renewing, 1 month).
// Plus → Premium is an upgrade (charged immediately, prorated); Premium → Plus
// is a downgrade (takes effect at the next renewal). Google Play never lets a
// customer hold both at once because every purchase of the other product is
// sent as a replacement of the current one.

export const GOOGLE_PACKAGE_NAME = 'app.old2new.twa'

export const GOOGLE_IAP_PRODUCTS = {
  wellness: {
    productId: 'old2new_plus_monthly',
    basePlanId: 'monthly',
    plan: 'wellness',
    name: 'Plus',
    fallbackPrice: '$14.99',          // shown only until Google Play returns the localized price
    monthlyTransformations: 50,
    savedRecipes: 50,
  },
  family: {
    productId: 'old2new_premium_monthly',
    basePlanId: 'monthly',
    plan: 'family',
    name: 'Premium',
    fallbackPrice: '$24.99',
    monthlyTransformations: 150,
    savedRecipes: 150,
  },
}

export const GOOGLE_IAP_PRODUCT_IDS = Object.values(GOOGLE_IAP_PRODUCTS).map(p => p.productId)

export const PLAN_BY_GOOGLE_PRODUCT_ID = Object.fromEntries(
  Object.values(GOOGLE_IAP_PRODUCTS).map(p => [p.productId, p.plan])
)

export function planForGoogleProductId(productId) {
  return PLAN_BY_GOOGLE_PRODUCT_ID[productId] || null
}

export function googleProductForPlan(plan) {
  return GOOGLE_IAP_PRODUCTS[plan] || null
}
