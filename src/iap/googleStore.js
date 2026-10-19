// Google Play Billing for the Android app, which is a Trusted Web Activity of
// old2new.app. Inside the TWA Chrome exposes the Digital Goods API
// (window.getDigitalGoodsService) and the Payment Request API with the
// 'https://play.google.com/billing' method; the Android wrapper
// (twa/android — androidbrowserhelper 'billing' module, Play Billing Library
// 8.x) bridges both to Google Play. Android only: every function is a no-op
// (or resolves empty) anywhere else, including the website and the iOS app.
//
// Entitlement flow (server-verified, mirrors src/iap/store.js for Apple):
//   purchasePlan() → Google Play purchase sheet → purchaseToken
//     → POST /api/google/verify (Bearer Supabase token)
//     → server fetches the purchase from the Google Play Developer API,
//       records it, acknowledges it, writes profiles.plan with the service role
//     → client reloads the profile. The client never writes `plan`.
//   A PENDING purchase (e.g. cash payment awaiting completion) is reported by
//   the server as pending and grants nothing until Google reports it paid.
import { GOOGLE_IAP_PRODUCTS, GOOGLE_IAP_PRODUCT_IDS, GOOGLE_PACKAGE_NAME, planForGoogleProductId } from './googleProducts.js'
import { PurchaseCancelled, PurchasePending } from './store.js'
import { apiUrl } from '../apiBase.js'
import { supabase } from '../supabase.js'

export const PLAY_BILLING_METHOD = 'https://play.google.com/billing'
const PLAN_LEVEL = { free: 0, wellness: 1, family: 2 }

export function googleBillingSupported() {
  try {
    return typeof window !== 'undefined'
      && typeof window.getDigitalGoodsService === 'function'
      && typeof window.PaymentRequest === 'function'
  } catch { return false }
}

let servicePromise = null
// Resolves to the Digital Goods service for Google Play, or null when the app
// is not running inside the billing-enabled Android app.
export function getService() {
  if (!googleBillingSupported()) return Promise.resolve(null)
  if (!servicePromise) {
    servicePromise = window.getDigitalGoodsService(PLAY_BILLING_METHOD)
      .catch((e) => { console.warn('[google-iap] Digital Goods unavailable:', e?.message || e); return null })
  }
  return servicePromise
}

export async function detectGoogleBilling() {
  return !!(await getService())
}

function formatPrice(price) {
  const value = Number(price?.value)
  const currency = price?.currency
  if (!currency || Number.isNaN(value)) return null
  try {
    return new Intl.NumberFormat(navigator.language || 'en-US', { style: 'currency', currency }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}

let productsCache = null

// Live, localized prices from Google Play for Plus and Premium.
export async function loadProducts() {
  const service = await getService()
  if (!service) return []
  if (productsCache) return productsCache
  const details = await service.getDetails(GOOGLE_IAP_PRODUCT_IDS)
  productsCache = (details || [])
    .filter(d => planForGoogleProductId(d.itemId))
    .map(d => ({
      productId: d.itemId,
      plan: planForGoogleProductId(d.itemId),
      title: d.title,
      description: d.description,
      priceString: formatPrice(d.price),
      price: Number(d.price?.value),
      currencyCode: d.price?.currency,
      period: d.subscriptionPeriod || 'P1M',
    }))
  return productsCache
}

async function authHeader() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Please sign in again to continue.')
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

// Sends one or more purchase tokens to the server. Resolves to the server's
// view of the account: { plan, source, googlePlan, results }.
export async function verifyWithServer(purchases) {
  const list = (Array.isArray(purchases) ? purchases : [purchases]).filter(p => p?.purchaseToken)
  if (list.length === 0) return null
  const res = await fetch(apiUrl('/api/google/verify'), {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ purchases: list.map(p => ({ purchaseToken: p.purchaseToken, productId: p.productId })) }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const friendly = res.status >= 500 || res.status === 503
      ? 'We could not confirm your subscription with our server just now. Any purchase is safe with Google Play and your plan will update automatically; you can also tap Restore Purchases in a moment.'
      : (body.error || 'Verification failed. Please try again.')
    console.error('[google-iap] verify failed:', res.status, body.error)
    const err = new Error(friendly)
    err.status = res.status
    throw err
  }
  return body
}

// Purchases Google Play says this Google account currently owns for our
// products: [{ purchaseToken, productId }].
export async function listOwnedPurchases() {
  const service = await getService()
  if (!service) return []
  try {
    const purchases = await service.listPurchases()
    return (purchases || [])
      .filter(p => p?.purchaseToken && GOOGLE_IAP_PRODUCT_IDS.includes(p.itemId))
      .map(p => ({ purchaseToken: p.purchaseToken, productId: p.itemId }))
  } catch (e) {
    console.warn('[google-iap] listPurchases failed:', e?.message || e)
    return []
  }
}

// Buy a plan, or switch to it when another of our plans is already owned on
// this Google account. Plus → Premium is charged immediately (prorated);
// Premium → Plus takes effect at the next renewal (deferred), matching the
// Apple behaviour described on the Pricing screen.
export async function purchasePlan(plan) {
  const product = GOOGLE_IAP_PRODUCTS[plan]
  if (!product) throw new Error('Unknown plan')
  const service = await getService()
  if (!service) throw new Error('Google Play Billing is not available in this app.')

  const owned = await listOwnedPurchases()
  const current = owned.find(p => p.productId !== product.productId) || null
  const data = { sku: product.productId }
  let deferred = false
  if (current) {
    const upgrade = PLAN_LEVEL[plan] > PLAN_LEVEL[planForGoogleProductId(current.productId)]
    deferred = !upgrade
    data.oldSku = current.productId
    data.purchaseToken = current.purchaseToken
    data.replacementMode = upgrade ? 'chargeProratedPrice' : 'deferred'
  }

  const request = new PaymentRequest(
    [{ supportedMethods: PLAY_BILLING_METHOD, data }],
    // "total" is required by the API but ignored by Google Play, which uses
    // the product's own price.
    { total: { label: 'Total', amount: { currency: 'USD', value: '0' } } },
  )
  let response
  try {
    response = await request.show()
  } catch (e) {
    const msg = String(e?.message || e || '').toLowerCase()
    if (e?.name === 'AbortError' || msg.includes('cancel') || msg.includes('abort')) throw new PurchaseCancelled('Purchase cancelled')
    throw e
  }

  const purchaseToken = response?.details?.purchaseToken || null
  // A deferred switch keeps the current purchase; Google may hand back no new
  // token. Either way the server re-reads every owned purchase so what it
  // writes is Google's current truth, never the client's claim.
  const toVerify = purchaseToken ? [{ purchaseToken, productId: product.productId }] : await listOwnedPurchases()
  let result
  try {
    result = await verifyWithServer(toVerify)
  } catch (e) {
    try { await response.complete('fail') } catch {}
    throw e
  }
  try { await response.complete('success') } catch {}

  const mine = result?.results?.find(r => r.purchaseToken === purchaseToken) || result?.results?.[0]
  if (mine?.pending) {
    throw new PurchasePending('Your purchase is waiting for Google Play to confirm payment. Your plan will update automatically once it is complete.')
  }
  return { ...result, deferred: deferred || !!mine?.deferredProductId, deferredPlan: deferred ? plan : (mine?.deferredProductId ? planForGoogleProductId(mine.deferredProductId) : null) }
}

// Called after sign-in and on app resume: push whatever Google Play state this
// device knows about to the server so profiles.plan is always reconciled.
// Returns the server result or null when the Google account owns nothing.
export async function syncEntitlements() {
  const owned = await listOwnedPurchases()
  if (owned.length === 0) return null
  return verifyWithServer(owned)
}

// Restore Purchases: same as a sync, triggered explicitly by the customer.
export async function restorePurchases() {
  return syncEntitlements()
}

// Google Play's subscription management page for this app (opens the Play
// Store app on Android).
export function manageSubscriptionsUrl(plan) {
  const sku = GOOGLE_IAP_PRODUCTS[plan]?.productId
  const params = new URLSearchParams({ package: GOOGLE_PACKAGE_NAME })
  if (sku) params.set('sku', sku)
  return `https://play.google.com/store/account/subscriptions?${params}`
}

export async function openManageSubscriptions(plan) {
  const url = manageSubscriptionsUrl(plan)
  const w = window.open(url, '_blank', 'noopener')
  if (!w) window.location.href = url
}
