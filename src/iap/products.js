// Single source of truth for Apple In-App Purchase product identifiers.
//
// Customer-facing plan names are Plus and Premium. The existing Supabase /
// Stripe entitlement values are 'wellness' (Plus) and 'family' (Premium) and
// are NOT renamed — this file is the mapping between the two worlds. The
// server-side copy of this mapping lives in api/_lib/appleProducts.js and a
// unit test keeps the two in sync.
//
// Both products belong to ONE App Store Connect subscription group
// ("Old2New Membership") so a customer can never hold Plus and Premium at the
// same time: StoreKit treats a switch as an upgrade/downgrade, never a second
// subscription. Group ranking: Premium = level 1 (higher), Plus = level 2.

export const SUBSCRIPTION_GROUP_NAME = 'Old2New Membership'

export const IAP_PRODUCTS = {
  wellness: {
    productId: 'app.old2new.ios.plus.monthly',
    plan: 'wellness',
    name: 'Plus',
    referenceName: 'Old2New Plus Monthly',
    fallbackPrice: '$14.99',          // shown only until StoreKit returns the localized price
    monthlyTransformations: 50,
    savedRecipes: 50,
  },
  family: {
    productId: 'app.old2new.ios.premium.monthly',
    plan: 'family',
    name: 'Premium',
    referenceName: 'Old2New Premium Monthly',
    fallbackPrice: '$24.99',
    monthlyTransformations: 150,
    savedRecipes: 150,
  },
}

export const IAP_PRODUCT_IDS = Object.values(IAP_PRODUCTS).map(p => p.productId)

export const PLAN_BY_PRODUCT_ID = Object.fromEntries(
  Object.values(IAP_PRODUCTS).map(p => [p.productId, p.plan])
)

export function planForProductId(productId) {
  return PLAN_BY_PRODUCT_ID[productId] || null
}

export function productForPlan(plan) {
  return IAP_PRODUCTS[plan] || null
}

// Customer-facing label for an internal plan value.
export const PLAN_DISPLAY_NAMES = { free: 'Free', wellness: 'Plus', family: 'Premium' }
