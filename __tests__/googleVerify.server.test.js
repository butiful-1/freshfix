// /api/google/verify and /api/google/notifications handlers with the Google
// Play Developer API and Supabase replaced by in-memory fakes.
import { describe, it, expect, beforeEach } from 'vitest'
import { makeHandler as makeVerify } from '../api/google/verify.js'
import { makeHandler as makeNotifications, decodeEnvelope } from '../api/google/notifications.js'
import { GooglePlayApiError, serviceAccountAssertion, parseServiceAccount, GooglePlayConfigError } from '../api/_lib/googlePlayClient.js'
import { fakeAdmin, purchaseV2 } from './helpers/googleFakes.js'
import { generateKeyPairSync, createVerify } from 'node:crypto'

const USER = '11111111-2222-4333-8444-555555555555'
const NOW = Date.now()

function req({ method = 'POST', body = {}, token = 'good', url = '/api/google/verify', query } = {}) {
  return { method, body, headers: { authorization: token ? `Bearer ${token}` : '', origin: 'https://old2new.app' }, url, query }
}
function res() {
  const r = { statusCode: 200, headers: {}, body: null }
  r.setHeader = (k, v) => { r.headers[k] = v }
  r.status = (c) => { r.statusCode = c; return r }
  r.json = (b) => { r.body = b; return r }
  r.end = () => r
  return r
}
const authClient = { auth: { getUser: async (t) => (t === 'good' ? { data: { user: { id: USER, email: 'kim@example.com' } } } : { data: { user: null }, error: new Error('bad') }) } }

function playWith(tokens) {
  const acks = []
  return {
    acks,
    getSubscription: async (t) => {
      if (!(t in tokens)) throw new GooglePlayApiError('not found', 404, {})
      if (tokens[t] instanceof Error) throw tokens[t]
      return tokens[t]
    },
    acknowledge: async (p, t) => { acks.push([p, t]) },
  }
}

describe('POST /api/google/verify', () => {
  let admin
  beforeEach(() => { admin = fakeAdmin({ profiles: { [USER]: { plan: 'free', entitlement_source: null } }, users: { [USER]: 'kim@example.com' } }) })

  it('requires a session and a purchase token', async () => {
    const h = makeVerify({ play: playWith({}), admin, authClient, stripe: null })
    let r = res(); await h(req({ token: '' }), r); expect(r.statusCode).toBe(401)
    r = res(); await h(req({ body: {} }), r); expect(r.statusCode).toBe(400)
    r = res(); await h(req({ token: 'bad', body: { purchaseToken: 'x'.repeat(20) } }), r); expect(r.statusCode).toBe(401)
  })
  it('verified active purchase → plan written and returned', async () => {
    const play = playWith({ tokA: purchaseV2() })
    const h = makeVerify({ play, admin, authClient, stripe: null })
    const r = res()
    await h(req({ body: { purchases: [{ purchaseToken: 'tokA', productId: 'old2new_plus_monthly' }] } }), r)
    expect(r.statusCode).toBe(200)
    expect(r.body).toMatchObject({ plan: 'wellness', source: 'google', googlePlan: 'wellness' })
    expect(r.body.results[0]).toMatchObject({ purchaseToken: 'tokA', status: 'active', active: true, pending: false })
    expect(admin.state.profiles[USER].plan).toBe('wellness')
    expect(play.acks).toEqual([['old2new_plus_monthly', 'tokA']])
  })
  it('client-claimed productId is ignored: Google decides what was bought', async () => {
    const play = playWith({ tokB: purchaseV2({ productId: 'old2new_premium_monthly' }) })
    const h = makeVerify({ play, admin, authClient, stripe: null })
    const r = res()
    await h(req({ body: { purchases: [{ purchaseToken: 'tokB', productId: 'old2new_plus_monthly' }] } }), r)
    expect(r.body.plan).toBe('family'); expect(r.body.results[0].productId).toBe('old2new_premium_monthly')
  })
  it('pending purchase → 200, pending flag, no entitlement', async () => {
    const play = playWith({ tokP: purchaseV2({ state: 'SUBSCRIPTION_STATE_PENDING' }) })
    const h = makeVerify({ play, admin, authClient, stripe: null })
    const r = res()
    await h(req({ body: { purchaseToken: 'tokP' } }), r)
    expect(r.body.plan).toBe('free'); expect(r.body.results[0].pending).toBe(true)
    expect(play.acks).toEqual([])
  })
  it('a token Google does not know is ignored, never granted', async () => {
    const h = makeVerify({ play: playWith({}), admin, authClient, stripe: null })
    const r = res()
    await h(req({ body: { purchaseToken: 'forged-token-value' } }), r)
    expect(r.statusCode).toBe(200); expect(r.body.plan).toBe('free'); expect(r.body.results[0].ignored).toBe(true)
  })
  it('Google unreachable → 502 and nothing written', async () => {
    const h = makeVerify({ play: playWith({ tokA: new GooglePlayApiError('boom', 503, {}) }), admin, authClient, stripe: null })
    const r = res()
    await h(req({ body: { purchaseToken: 'tokA' } }), r)
    expect(r.statusCode).toBe(502); expect(admin.state.profiles[USER].plan).toBe('free')
  })
  it('purchase owned by another account → 409', async () => {
    admin.state.googleRows.tokA = { purchase_token: 'tokA', user_id: 'someone-else', status: 'active', plan: 'wellness' }
    const h = makeVerify({ play: playWith({ tokA: purchaseV2() }), admin, authClient, stripe: null })
    const r = res()
    await h(req({ body: { purchaseToken: 'tokA' } }), r)
    expect(r.statusCode).toBe(409); expect(admin.state.profiles[USER].plan).toBe('free')
  })
  it('server not configured → 503 with a friendly message', async () => {
    const h = makeVerify({ play: { getSubscription: async () => { throw new GooglePlayConfigError('missing') } }, admin, authClient, stripe: null })
    const r = res()
    await h(req({ body: { purchaseToken: 'tokA' } }), r)
    expect(r.statusCode).toBe(503)
  })
})

describe('POST /api/google/notifications (RTDN via Pub/Sub push)', () => {
  const envelope = (note, messageId = 'm1') => ({ message: { data: Buffer.from(JSON.stringify(note)).toString('base64'), messageId }, subscription: 'projects/x/subscriptions/y' })
  const note = (notificationType, purchaseToken = 'tokA') => ({ version: '1.0', packageName: 'app.old2new.twa', eventTimeMillis: String(NOW), subscriptionNotification: { version: '1.0', notificationType, purchaseToken } })
  let admin
  beforeEach(() => {
    admin = fakeAdmin({ profiles: { [USER]: { plan: 'wellness', entitlement_source: 'google' } }, users: { [USER]: 'kim@example.com' } })
    admin.state.googleRows.tokA = { purchase_token: 'tokA', user_id: USER, product_id: 'old2new_plus_monthly', plan: 'wellness', status: 'active', expires_at: new Date(NOW + 86400000).toISOString() }
  })

  it('decodes the Pub/Sub envelope', () => {
    expect(decodeEnvelope(envelope(note(2)))).toMatchObject({ packageName: 'app.old2new.twa', subscriptionNotification: { notificationType: 2 } })
    expect(decodeEnvelope({})).toBe(null)
  })
  it('rejects a wrong shared token', async () => {
    const h = makeNotifications({ play: playWith({}), admin, stripe: null, env: { GOOGLE_PLAY_RTDN_TOKEN: 'secret' } })
    const r = res()
    await h(req({ body: envelope(note(2)), url: '/api/google/notifications?token=wrong', query: { token: 'wrong' } }), r)
    expect(r.statusCode).toBe(401)
  })
  it('EXPIRED: re-fetches from Google and drops the user to free', async () => {
    const play = playWith({ tokA: purchaseV2({ state: 'SUBSCRIPTION_STATE_EXPIRED', expiry: NOW - 1, ack: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED', autoRenew: false }) })
    const h = makeNotifications({ play, admin, stripe: null, env: { GOOGLE_PLAY_RTDN_TOKEN: 'secret' } })
    const r = res()
    await h(req({ body: envelope(note(13)), url: '/api/google/notifications?token=secret', query: { token: 'secret' } }), r)
    expect(r.statusCode).toBe(200); expect(r.body.handled).toBe(true)
    expect(admin.state.profiles[USER]).toMatchObject({ plan: 'free', entitlement_source: null })
  })
  it('RENEWED keeps the plan; a forged notification can only re-sync real Google state', async () => {
    const play = playWith({ tokA: purchaseV2({ ack: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED', expiry: NOW + 60 * 86400000 }) })
    const h = makeNotifications({ play, admin, stripe: null, env: {} })
    const r = res()
    await h(req({ body: envelope(note(2)) , url: '/api/google/notifications' }), r)
    expect(r.statusCode).toBe(200)
    expect(admin.state.profiles[USER].plan).toBe('wellness')
    expect(admin.state.googleRows.tokA.last_notification_type).toBe('SUBSCRIPTION_RENEWED')
  })
  it('test notifications and other packages are acknowledged without changes', async () => {
    const h = makeNotifications({ play: playWith({}), admin, stripe: null, env: {} })
    let r = res()
    await h(req({ body: envelope({ version: '1.0', packageName: 'app.old2new.twa', testNotification: { version: '1.0' } }), url: '/x' }), r)
    expect(r.statusCode).toBe(200); expect(r.body.test).toBe(true)
    r = res()
    await h(req({ body: envelope({ ...note(13), packageName: 'com.other.app' }), url: '/x' }), r)
    expect(r.statusCode).toBe(200); expect(r.body.handled).toBe(false)
    expect(admin.state.profiles[USER].plan).toBe('wellness')
  })
  it('unknown token → 200 (no retry storm); Google outage → 500 (Pub/Sub retries)', async () => {
    let h = makeNotifications({ play: playWith({}), admin, stripe: null, env: {} })
    let r = res()
    await h(req({ body: envelope(note(13, 'gone')), url: '/x' }), r)
    expect(r.statusCode).toBe(200)
    h = makeNotifications({ play: playWith({ tokA: new GooglePlayApiError('down', 503, {}) }), admin, stripe: null, env: {} })
    r = res()
    await h(req({ body: envelope(note(13)), url: '/x' }), r)
    expect(r.statusCode).toBe(500)
  })
})

describe('service-account auth', () => {
  it('builds a verifiable RS256 assertion from a key file', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' })
    const sa = parseServiceAccount({ GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: Buffer.from(JSON.stringify({ client_email: 'svc@proj.iam.gserviceaccount.com', private_key: pem })).toString('base64') })
    const jwt = serviceAccountAssertion(sa, 1_700_000_000)
    const [h, c, s] = jwt.split('.')
    expect(JSON.parse(Buffer.from(h, 'base64url'))).toEqual({ alg: 'RS256', typ: 'JWT' })
    const claims = JSON.parse(Buffer.from(c, 'base64url'))
    expect(claims).toMatchObject({ iss: 'svc@proj.iam.gserviceaccount.com', scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: 1_700_000_000, exp: 1_700_003_600 })
    const v = createVerify('RSA-SHA256'); v.update(`${h}.${c}`)
    expect(v.verify(publicKey, Buffer.from(s, 'base64url'))).toBe(true)
  })
  it('reports missing configuration clearly', () => {
    expect(() => parseServiceAccount({})).toThrow(GooglePlayConfigError)
    expect(() => parseServiceAccount({ GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: '{"client_email":"x"}' })).toThrow(/private_key/)
  })
})
