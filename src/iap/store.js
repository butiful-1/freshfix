// Thin wrapper around the StoreKit 2 plugin so the rest of the app never
// touches the plugin API directly (swapping the plugin later is contained
// here). iOS only; every function is a no-op elsewhere.
//
// Entitlement flow (App Store 3.1.1, server-verified):
//   purchase() → StoreKit sheet → signed transaction (JWS)
//     → POST /api/apple/verify (Bearer Supabase token)
//     → server verifies signature with Apple's root certs, records the
//       subscription, writes profiles.plan with the service role
//     → client reloads the profile. The client never writes `plan`.
//   Transactions are finished only AFTER the server accepted them; an
//   unfinished transaction is re-delivered by StoreKit on the next launch
//   (transactionUpdated) so an interrupted purchase is never lost.
import { NativePurchases } from '@capgo/native-purchases'
import { IAP_PRODUCT_IDS, IAP_PRODUCTS, planForProductId } from './products.js'
import { apiUrl } from '../apiBase.js'
import { supabase } from '../supabase.js'
import { isIOSNative } from '../platform.js'

export const iapAvailable = () => isIOSNative()

let productsCache = null

export async function loadProducts() {
  if (!iapAvailable()) return []
  if (productsCache) return productsCache
  const { products } = await NativePurchases.getProducts({ productIdentifiers: IAP_PRODUCT_IDS, productType: 'subs' })
  productsCache = (products || []).map(p => ({
    productId: p.identifier,
    plan: planForProductId(p.identifier),
    title: p.title,
    description: p.description,
    priceString: p.priceString,
    price: p.price,
    currencyCode: p.currencyCode,
    period: p.subscriptionPeriod,
  }))
  return productsCache
}

async function authHeader() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Please sign in again to continue.')
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

// Sends one or more signed transactions to the server. Resolves to the
// server's view of the account: { plan, source, applePlan }.
export async function verifyWithServer(jwsList) {
  const list = (Array.isArray(jwsList) ? jwsList : [jwsList]).filter(Boolean)
  if (list.length === 0) return null
  const res = await fetch(apiUrl('/api/apple/verify'), {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ transactions: list }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    // 4xx carries a message meant for the user (ownership conflict, session);
    // 5xx is our problem — never show raw server text, and tell the user the
    // purchase is safe: StoreKit keeps the transaction and we retry at launch.
    const friendly = res.status >= 500
      ? 'We could not confirm your subscription with our server just now. Any purchase is safe with Apple and your plan will update automatically; you can also tap Restore Purchases in a moment.'
      : (body.error || 'Verification failed. Please try again.')
    console.error('[iap] verify failed:', res.status, body.error)
    const err = new Error(friendly)
    err.status = res.status
    throw err
  }
  return body
}

async function finish(transactionId) {
  if (!transactionId) return
  try { await NativePurchases.acknowledgePurchase({ purchaseToken: String(transactionId) }) } catch { /* already finished */ }
}

export class PurchaseCancelled extends Error {}
export class PurchasePending extends Error {}

// Buy (or switch to) a plan. `userId` becomes the appAccountToken so Apple's
// server notifications can be matched to this account.
export async function purchasePlan(plan, userId) {
  const product = IAP_PRODUCTS[plan]
  if (!product) throw new Error('Unknown plan')
  let tx
  try {
    tx = await NativePurchases.purchaseProduct({
      productIdentifier: product.productId,
      productType: 'subs',
      appAccountToken: userId,
      autoAcknowledgePurchases: false,
    })
  } catch (e) {
    const msg = String(e?.message || e || '').toLowerCase()
    if (msg.includes('cancel')) throw new PurchaseCancelled('Purchase cancelled')
    if (msg.includes('pending') || msg.includes('deferred') || msg.includes('ask to buy') || msg.includes('approval')) {
      throw new PurchasePending('Your purchase is waiting for approval. Your plan will update once it is approved.')
    }
    throw e
  }
  if (!tx?.jwsRepresentation) {
    // Pending (e.g. Ask to Buy) purchases resolve without a transaction.
    throw new PurchasePending('Your purchase is waiting for approval. Your plan will update once it is approved.')
  }
  const result = await verifyWithServer(tx.jwsRepresentation)
  await finish(tx.transactionId)
  return result
}

// Returns the newest signed transaction for each of our products from the
// device's StoreKit history (current entitlements first, then all history so
// an expired subscription can also be reported to the server).
async function latestTransactionsOnDevice() {
  const byProduct = new Map()
  const consider = (t) => {
    if (!t?.jwsRepresentation || !IAP_PRODUCT_IDS.includes(t.productIdentifier)) return
    const prev = byProduct.get(t.productIdentifier)
    const ts = Date.parse(t.expirationDate || t.purchaseDate || 0) || 0
    if (!prev || ts > prev.ts) byProduct.set(t.productIdentifier, { ts, jws: t.jwsRepresentation, tx: t })
  }
  try {
    const { purchases } = await NativePurchases.getPurchases({ productType: 'subs', onlyCurrentEntitlements: true })
    ;(purchases || []).forEach(consider)
  } catch (e) { console.warn('[iap] currentEntitlements failed:', e.message) }
  if (byProduct.size === 0) {
    try {
      const { purchases } = await NativePurchases.getPurchases({ productType: 'subs' })
      ;(purchases || []).forEach(consider)
    } catch (e) { console.warn('[iap] purchase history failed:', e.message) }
  }
  return [...byProduct.values()]
}

// Called after sign-in and on app resume: push whatever Apple state this
// device knows about to the server so profiles.plan is always reconciled.
// Returns the server result or null when the device has no Apple purchases.
export async function syncEntitlements() {
  if (!iapAvailable()) return null
  const latest = await latestTransactionsOnDevice()
  if (latest.length === 0) return null
  const result = await verifyWithServer(latest.map(l => l.jws))
  for (const l of latest) await finish(l.tx.transactionId)
  return result
}

// Restore Purchases (App Store 3.1.1 requires an explicit control).
export async function restorePurchases() {
  if (!iapAvailable()) return null
  try { await NativePurchases.restorePurchases() } catch (e) { console.warn('[iap] AppStore.sync failed:', e.message) }
  return syncEntitlements()
}

export async function openManageSubscriptions() {
  if (!iapAvailable()) return
  await NativePurchases.manageSubscriptions()
}

// Renewals, upgrades/downgrades, Ask-to-Buy approvals and revocations that
// happen while the app is open arrive here. The plugin has already finished
// the transaction; we just verify it with the server.
export function onTransactionUpdated(handler) {
  if (!iapAvailable()) return () => {}
  const p = NativePurchases.addListener('transactionUpdated', async (tx) => {
    if (!tx?.jwsRepresentation || !IAP_PRODUCT_IDS.includes(tx.productIdentifier)) return
    try {
      const result = await verifyWithServer(tx.jwsRepresentation)
      handler(result, tx)
    } catch (e) {
      console.error('[iap] transactionUpdated verify failed:', e.message)
    }
  })
  return () => { p.then(h => h.remove()).catch(() => {}) }
}
