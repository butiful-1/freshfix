// POST /api/google/verify — the Android app (Trusted Web Activity using the
// Digital Goods API) sends the purchase token(s) it just bought / restored /
// found at launch. The server fetches the authoritative state of every token
// from the Google Play Developer API, records the subscription, acknowledges a
// new purchase, and writes the resulting plan to profiles with the service
// role. The client never writes `plan` itself (the database rejects it), so
// paid access is never granted on an unverified client-side flag — and a
// PENDING purchase is recorded but grants nothing until Google reports it paid.
import { makePlayClient, GooglePlayConfigError, GooglePlayApiError } from '../_lib/googlePlayClient.js'
import { applyGooglePurchase, supabaseAdmin, supabaseAuthClient, stripeClient, EntitlementOwnershipError } from '../_lib/googleEntitlement.js'
import { GOOGLE_ACTIVE_STATUSES } from '../_lib/entitlement.js'

export const config = { maxDuration: 15 }

const ALLOWED_ORIGINS = [
  'https://old2new.app',
  'https://www.old2new.app',
  'http://localhost:5174',
  'http://localhost:5173',
  'http://localhost:4173',
]

export function makeHandler({ play: injectedPlay, admin: injectedAdmin, authClient: injectedAuth, stripe: injectedStripe } = {}) {
  return async function handler(req, res) {
    const origin = req.headers.origin
    if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Vary', 'Origin')
    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (!token) return res.status(401).json({ error: 'Not signed in' })

    const body = req.body || {}
    const list = Array.isArray(body.purchases) ? body.purchases : (body.purchaseToken ? [{ purchaseToken: body.purchaseToken, productId: body.productId }] : [])
    const purchases = list
      .filter(p => p && typeof p.purchaseToken === 'string' && p.purchaseToken.length > 0 && p.purchaseToken.length < 4096)
      .slice(0, 20)
    if (purchases.length === 0) return res.status(400).json({ error: 'A Google Play purchase token is required' })

    // 1. Who is asking?
    const auth = injectedAuth || supabaseAuthClient()
    const { data: userData, error: userErr } = await auth.auth.getUser(token)
    const user = userData?.user
    if (userErr || !user) return res.status(401).json({ error: 'Invalid session' })

    // 2. Fetch the authoritative state of every token from Google BEFORE
    //    touching the database.
    let play
    try { play = injectedPlay || makePlayClient() } catch (e) {
      console.error('[google/verify] not configured:', e.message)
      return res.status(503).json({ error: 'Google Play verification is not configured on the server yet.' })
    }
    const fetched = []
    for (const p of purchases) {
      try {
        const purchase = await play.getSubscription(p.purchaseToken)
        fetched.push({ purchaseToken: p.purchaseToken, purchase })
      } catch (e) {
        if (e instanceof GooglePlayConfigError) return res.status(503).json({ error: 'Google Play verification is not configured on the server yet.' })
        const status = e instanceof GooglePlayApiError ? e.status : 0
        console.error('[google/verify] lookup failed:', e.message)
        if (status === 400 || status === 404 || status === 410) {
          // Not a purchase of this app / malformed token: ignore it, never grant.
          fetched.push({ purchaseToken: p.purchaseToken, invalid: true })
          continue
        }
        return res.status(502).json({ error: 'Google Play could not be reached to confirm the purchase. Your purchase is safe — please try again in a moment.' })
      }
    }
    console.log(`[google/verify] user ${user.id}: ${fetched.length} token(s) — ${fetched.map(f => f.invalid ? 'invalid' : `${(f.purchase.lineItems || []).map(li => li.productId).join('+')} ${f.purchase.subscriptionState} ack=${f.purchase.acknowledgementState}${f.purchase.testPurchase ? ' TEST' : ''}`).join('; ')}`)

    // 3. Record and reconcile (service role).
    let admin
    try { admin = injectedAdmin || supabaseAdmin() } catch (e) {
      console.error('[google/verify] cannot write entitlement:', e.message)
      return res.status(500).json({ error: e.message })
    }
    const stripe = injectedStripe !== undefined ? injectedStripe : stripeClient()
    const results = []
    let last = null
    for (const f of fetched) {
      if (f.invalid) { results.push({ purchaseToken: f.purchaseToken, ignored: true }); continue }
      try {
        const r = await applyGooglePurchase({ admin, stripe, play, purchaseToken: f.purchaseToken, purchase: f.purchase, requestingUserId: user.id })
        if (r?.ignored) { results.push({ purchaseToken: f.purchaseToken, ignored: true }); continue }
        last = r
        console.log(`[google/verify] user ${user.id}: ${r.row.product_id} ${r.row.status} → plan ${r.plan} (${r.entitlement_source || 'free'})`)
        results.push({
          purchaseToken: f.purchaseToken, productId: r.row.product_id, status: r.row.status, expiresAt: r.row.expires_at,
          pending: r.row.status === 'pending', active: GOOGLE_ACTIVE_STATUSES.includes(r.row.status), deferredProductId: r.row.deferred_product_id,
        })
      } catch (e) {
        if (e instanceof EntitlementOwnershipError) return res.status(409).json({ error: e.message })
        console.error('[google/verify] apply failed:', e.message)
        return res.status(500).json({ error: 'Could not record the subscription. Please try again.' })
      }
    }

    if (!last) {
      const { data: profile } = await admin.from('profiles').select('plan, entitlement_source').eq('id', user.id).maybeSingle()
      return res.json({ plan: profile?.plan || 'free', source: profile?.entitlement_source || null, googlePlan: null, results })
    }
    return res.json({ plan: last.plan, source: last.entitlement_source, googlePlan: last.googlePlan, results })
  }
}

export default makeHandler()
