// Server-side mirror of src/iap/products.js (kept identical by
// __tests__/iapProducts.test.js). Vercel functions cannot import from src/.
export const APPLE_BUNDLE_ID = 'app.old2new.ios'

export const APPLE_PRODUCTS = {
  'app.old2new.ios.plus.monthly':    { plan: 'wellness', name: 'Plus' },
  'app.old2new.ios.premium.monthly': { plan: 'family',   name: 'Premium' },
}

export function planForAppleProduct(productId) {
  return APPLE_PRODUCTS[productId]?.plan || null
}

export const APPLE_PRODUCT_IDS = Object.keys(APPLE_PRODUCTS)
