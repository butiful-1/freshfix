// Server-side mirror of src/iap/googleProducts.js (kept identical by
// __tests__/googleProducts.test.js). Vercel functions cannot import from src/.
//
// Google Play subscription product ids for the Android app (package
// app.old2new.twa). Each product has ONE monthly base plan. Internal plan values
// ('wellness' = Plus, 'family' = Premium) are unchanged.
export const GOOGLE_PACKAGE_NAME = 'app.old2new.twa'

export const GOOGLE_PRODUCTS = {
  'old2new_plus_monthly':    { plan: 'wellness', name: 'Plus',    basePlanId: 'monthly' },
  'old2new_premium_monthly': { plan: 'family',   name: 'Premium', basePlanId: 'monthly' },
}

export function planForGoogleProduct(productId) {
  return GOOGLE_PRODUCTS[productId]?.plan || null
}

export const GOOGLE_PRODUCT_IDS = Object.keys(GOOGLE_PRODUCTS)
