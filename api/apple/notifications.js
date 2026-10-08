// POST /api/apple/notifications — App Store Server Notifications V2.
// Configure BOTH the Production and Sandbox notification URLs in App Store
// Connect to https://old2new.app/api/apple/notifications; the environment is
// read from the signed payload itself. Every payload is signature-verified
// against Apple's root certificates before anything is written.
import { verifyNotificationJws, AppleEnvironmentError } from '../_lib/appleVerifier.js'
import { applyAppleTransaction, supabaseAdmin, stripeClient } from '../_lib/appleEntitlement.js'

export const config = { maxDuration: 15 }

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c))
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

// Notification types that carry a transaction we must apply. Everything else
// (CONSUMPTION_REQUEST, PRICE_INCREASE, RENEWAL_EXTENSION summaries, TEST…)
// is acknowledged and logged only.
const HANDLED = new Set([
  'SUBSCRIBED', 'DID_RENEW', 'DID_CHANGE_RENEWAL_PREF', 'DID_CHANGE_RENEWAL_STATUS',
  'DID_FAIL_TO_RENEW', 'EXPIRED', 'GRACE_PERIOD_EXPIRED', 'REFUND', 'REFUND_REVERSED',
  'REVOKE', 'OFFER_REDEEMED', 'RENEWAL_EXTENDED', 'PRICE_INCREASE',
])

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  let body
  try { body = await readJsonBody(req) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }
  const signedPayload = body?.signedPayload
  if (typeof signedPayload !== 'string') return res.status(400).json({ error: 'signedPayload required' })

  let decoded, verifier
  try {
    ({ decoded, verifier } = await verifyNotificationJws(signedPayload))
  } catch (e) {
    const status = e instanceof AppleEnvironmentError ? 503 : 401
    console.error('[apple/notifications] rejected:', e.message)
    return res.status(status).json({ error: 'Notification could not be verified' })
  }

  const type = decoded.notificationType
  const subtype = decoded.subtype || null
  console.log(`[apple/notifications] ${type}${subtype ? '/' + subtype : ''} id=${decoded.notificationUUID}`)

  if (type === 'TEST' || !HANDLED.has(type) || !decoded.data?.signedTransactionInfo) {
    return res.status(200).json({ received: true, handled: false })
  }

  try {
    const tx = await verifier.verifyAndDecodeTransaction(decoded.data.signedTransactionInfo)
    const renewal = decoded.data.signedRenewalInfo
      ? await verifier.verifyAndDecodeRenewalInfo(decoded.data.signedRenewalInfo)
      : null
    const admin = supabaseAdmin()
    const result = await applyAppleTransaction({ admin, stripe: stripeClient(), tx, renewal, notificationType: type })
    if (result?.unassigned) console.warn(`[apple/notifications] ${type}: no Old2New user for originalTransactionId ${tx.originalTransactionId}`)
    else if (!result?.ignored) console.log(`[apple/notifications] ${type}: user ${result.userId} → plan ${result.plan} (${result.entitlement_source || 'free'})`)
    return res.status(200).json({ received: true, handled: true })
  } catch (e) {
    // A 5xx makes Apple retry the notification later, which is what we want
    // for transient database errors.
    console.error('[apple/notifications] processing failed:', e.message)
    return res.status(500).json({ error: 'Processing failed' })
  }
}
