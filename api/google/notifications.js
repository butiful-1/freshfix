// POST /api/google/notifications — Google Play Real-time developer
// notifications (RTDN), delivered as a Cloud Pub/Sub push subscription.
//
// Setup (docs/google-play-billing-setup.md): Pub/Sub topic → push
// subscription to https://old2new.app/api/google/notifications?token=<GOOGLE_PLAY_RTDN_TOKEN>
// → Play Console → Monetize → Monetization setup → topic name.
//
// A notification only says "this purchase token changed". The state itself is
// always re-fetched from the Google Play Developer API, so even a forged
// message can do no more than trigger a legitimate re-sync of a real purchase.
// The shared token in the query string keeps strangers from making us call
// Google at all.
import { makePlayClient, GooglePlayApiError } from '../_lib/googlePlayClient.js'
import { applyGooglePurchase, supabaseAdmin, stripeClient, RTDN } from '../_lib/googleEntitlement.js'
import { GOOGLE_PACKAGE_NAME } from '../_lib/googleProducts.js'

export const config = { maxDuration: 15 }

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c))
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

// Decodes the Pub/Sub envelope into the DeveloperNotification it carries.
export function decodeEnvelope(body) {
  const data = body?.message?.data
  if (typeof data !== 'string') return null
  try { return JSON.parse(Buffer.from(data, 'base64').toString('utf8')) } catch { return null }
}

export function makeHandler({ play: injectedPlay, admin: injectedAdmin, stripe: injectedStripe, env = process.env } = {}) {
  return async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end()

    const expected = env.GOOGLE_PLAY_RTDN_TOKEN
    const supplied = (req.query && req.query.token) || new URL(req.url || '/', 'http://x').searchParams.get('token')
    if (expected && supplied !== expected) return res.status(401).json({ error: 'Unauthorized' })

    let body
    try { body = await readJsonBody(req) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }
    const note = decodeEnvelope(body)
    if (!note) return res.status(400).json({ error: 'message.data required' })

    const messageId = body?.message?.messageId || body?.message?.message_id || null
    const packageName = env.GOOGLE_PLAY_PACKAGE_NAME || GOOGLE_PACKAGE_NAME
    if (note.packageName && note.packageName !== packageName) {
      console.warn(`[google/notifications] ignoring notification for ${note.packageName}`)
      return res.status(200).json({ received: true, handled: false })
    }

    if (note.testNotification) {
      console.log(`[google/notifications] TEST notification received (message ${messageId})`)
      return res.status(200).json({ received: true, handled: false, test: true })
    }

    const sub = note.subscriptionNotification
    const voided = note.voidedPurchaseNotification
    const purchaseToken = sub?.purchaseToken || voided?.purchaseToken
    const typeName = sub ? (RTDN[sub.notificationType] || `TYPE_${sub.notificationType}`) : (voided ? 'VOIDED_PURCHASE' : null)
    if (!purchaseToken) {
      console.log(`[google/notifications] no purchase token in message ${messageId} — ignored`)
      return res.status(200).json({ received: true, handled: false })
    }
    console.log(`[google/notifications] ${typeName} message=${messageId}`)

    try {
      const play = injectedPlay || makePlayClient()
      let purchase
      try {
        purchase = await play.getSubscription(purchaseToken)
      } catch (e) {
        const status = e instanceof GooglePlayApiError ? e.status : 0
        if (status === 400 || status === 404 || status === 410) {
          // Token Google no longer knows about: nothing to reconcile, do not retry.
          console.warn(`[google/notifications] ${typeName}: token not found (${status}) — acknowledged without changes`)
          return res.status(200).json({ received: true, handled: false })
        }
        throw e
      }
      const admin = injectedAdmin || supabaseAdmin()
      const stripe = injectedStripe !== undefined ? injectedStripe : stripeClient()
      const result = await applyGooglePurchase({ admin, stripe, play, purchaseToken, purchase, notificationType: typeName })
      if (result?.unassigned) console.warn(`[google/notifications] ${typeName}: no Old2New user linked to this purchase yet (${result.row.product_id} ${result.row.status})`)
      else if (result?.ignored) console.log(`[google/notifications] ${typeName}: ignored — ${result.reason}`)
      else console.log(`[google/notifications] ${typeName}: user ${result.userId} ${result.row.product_id} ${result.row.status} → plan ${result.plan} (${result.entitlement_source || 'free'})`)
      return res.status(200).json({ received: true, handled: !result?.ignored })
    } catch (e) {
      // A 5xx makes Pub/Sub redeliver the message later, which is what we want
      // for transient Google / database errors.
      console.error('[google/notifications] processing failed:', e.message)
      return res.status(500).json({ error: 'Processing failed' })
    }
  }
}

export default makeHandler()
