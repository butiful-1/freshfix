// Minimal Google Play Developer API client (no googleapis dependency).
//
// Authenticates as a service account (JSON key in the environment) with a
// self-signed RS256 JWT exchanged for an OAuth access token, then calls:
//   • purchases.subscriptionsv2.get      — current state of a purchase token
//   • purchases.subscriptions.acknowledge — acknowledge a new purchase
//
// Environment:
//   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON — the service-account key file contents
//                                      (raw JSON or base64 of it)
//   GOOGLE_PLAY_PACKAGE_NAME         — optional, defaults to app.old2new.twa
import crypto from 'node:crypto'
import { GOOGLE_PACKAGE_NAME } from './googleProducts.js'

const SCOPE = 'https://www.googleapis.com/auth/androidpublisher'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3'

export class GooglePlayConfigError extends Error {}
export class GooglePlayApiError extends Error {
  constructor(message, status, body) { super(message); this.status = status; this.body = body }
}

const b64url = (buf) => Buffer.from(buf).toString('base64url')

export function parseServiceAccount(env = process.env) {
  const raw = env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
  if (!raw) throw new GooglePlayConfigError('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not configured')
  let text = raw.trim()
  if (!text.startsWith('{')) text = Buffer.from(text, 'base64').toString('utf8')
  let sa
  try { sa = JSON.parse(text) } catch { throw new GooglePlayConfigError('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not valid JSON') }
  if (!sa.client_email || !sa.private_key) throw new GooglePlayConfigError('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is missing client_email/private_key')
  return sa
}

// Builds the signed JWT assertion for the service account.
export function serviceAccountAssertion(sa, now = Math.floor(Date.now() / 1000)) {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }))
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${claims}`), sa.private_key)
  return `${header}.${claims}.${b64url(signature)}`
}

// One cached access token per function instance.
let cached = { token: null, expiresAt: 0, key: null }

export async function getAccessToken({ env = process.env, fetchImpl = fetch } = {}) {
  const sa = parseServiceAccount(env)
  const now = Date.now()
  if (cached.token && cached.key === sa.client_email && cached.expiresAt - 60_000 > now) return cached.token
  const body = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: serviceAccountAssertion(sa) })
  const res = await fetchImpl(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.access_token) throw new GooglePlayApiError(`Google OAuth token request failed (${res.status}): ${json.error_description || json.error || 'unknown'}`, res.status, json)
  cached = { token: json.access_token, expiresAt: now + (Number(json.expires_in) || 3600) * 1000, key: sa.client_email }
  return cached.token
}

export function resetTokenCache() { cached = { token: null, expiresAt: 0, key: null } }

export function makePlayClient({ env = process.env, fetchImpl = fetch } = {}) {
  const packageName = env.GOOGLE_PLAY_PACKAGE_NAME || GOOGLE_PACKAGE_NAME

  async function call(method, path, body) {
    const token = await getAccessToken({ env, fetchImpl })
    const res = await fetchImpl(`${API}/applications/${encodeURIComponent(packageName)}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    let json = {}
    try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }
    if (!res.ok) {
      const msg = json?.error?.message || res.statusText || 'request failed'
      throw new GooglePlayApiError(`Google Play API ${method} ${path} failed (${res.status}): ${msg}`, res.status, json)
    }
    return json
  }

  return {
    packageName,
    // SubscriptionPurchaseV2 for a purchase token (any product of this package).
    getSubscription: (purchaseToken) => call('GET', `/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`),
    // Acknowledge a purchased subscription (required within 3 days or Google refunds it).
    acknowledge: (productId, purchaseToken) =>
      call('POST', `/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`, {}),
  }
}
