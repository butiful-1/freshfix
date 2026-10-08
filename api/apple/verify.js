// POST /api/apple/verify — the iOS app sends the StoreKit 2 signed transaction
// (JWS) it just purchased / restored / found at launch. The server verifies the
// signature against Apple's root certificates, records the subscription, and
// writes the resulting plan to profiles with the service role. The client never
// writes `plan` itself (the database rejects it), so paid access is never
// granted on an unverified client-side flag.
import { verifyTransactionJws, AppleEnvironmentError } from '../_lib/appleVerifier.js'
import { applyAppleTransaction, supabaseAdmin, stripeClient, EntitlementOwnershipError } from '../_lib/appleEntitlement.js'
import { APPLE_PRODUCT_IDS } from '../_lib/appleProducts.js'

export const config = { maxDuration: 15 }

const ALLOWED_ORIGINS = [
  'capacitor://localhost', // iOS app (Capacitor WebView origin)
  'https://old2new.app',
  'https://www.old2new.app',
  'http://localhost:5174',
  'http://localhost:5173',
  'http://localhost:4173',
]

export default async function handler(req, res) {
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
  const list = Array.isArray(body.transactions) ? body.transactions : (body.jws ? [body.jws] : [])
  const jwsList = list.filter(j => typeof j === 'string' && j.split('.').length === 3).slice(0, 20)
  if (jwsList.length === 0) return res.status(400).json({ error: 'A signed transaction (jws) is required' })

  let admin
  try { admin = supabaseAdmin() } catch (e) { return res.status(500).json({ error: e.message }) }

  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  const user = userData?.user
  if (userErr || !user) return res.status(401).json({ error: 'Invalid session' })

  const stripe = stripeClient()
  const results = []
  let last = null
  for (const jws of jwsList) {
    let tx
    try {
      tx = await verifyTransactionJws(jws)
    } catch (e) {
      if (e instanceof AppleEnvironmentError) {
        console.error('[apple/verify] environment:', e.message)
        return res.status(503).json({ error: e.message })
      }
      console.error('[apple/verify] verification failed:', e.message)
      return res.status(422).json({ error: 'Apple transaction could not be verified' })
    }
    if (!APPLE_PRODUCT_IDS.includes(tx.productId)) {
      results.push({ transactionId: tx.transactionId, ignored: true })
      continue
    }
    try {
      last = await applyAppleTransaction({ admin, stripe, tx, requestingUserId: user.id })
      results.push({ transactionId: tx.transactionId, productId: tx.productId, status: last.row?.status, expiresAt: last.row?.expires_at })
    } catch (e) {
      if (e instanceof EntitlementOwnershipError) return res.status(409).json({ error: e.message })
      console.error('[apple/verify] apply failed:', e.message)
      return res.status(500).json({ error: 'Could not record the subscription. Please try again.' })
    }
  }

  if (!last) {
    const { data: profile } = await admin.from('profiles').select('plan, entitlement_source').eq('id', user.id).maybeSingle()
    return res.json({ plan: profile?.plan || 'free', source: profile?.entitlement_source || null, results })
  }
  return res.json({ plan: last.plan, source: last.entitlement_source, applePlan: last.applePlan, results })
}
