// Server-side Apple verification + entitlement application, exercised with
// unsigned StoreKit-testing ("Xcode" environment) payloads exactly as the local
// StoreKit configuration produces them. Signature verification is skipped for
// that environment by Apple's library, and this server only accepts it when
// APPLE_ALLOW_XCODE_ENV=1 — the production server never does.
import { describe, it, expect, beforeEach } from 'vitest'
import { verifyTransactionJws, allowedEnvironments, makeVerifier, AppleEnvironmentError, peekJwsPayload } from '../api/_lib/appleVerifier.js'
import { applyAppleTransaction, deriveAppleStatus, rowFromTransaction, EntitlementOwnershipError } from '../api/_lib/appleEntitlement.js'

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
function fakeJws(payload, header = { alg: 'ES256', x5c: [] }) {
  return `${b64(header)}.${b64(payload)}.c2ln`
}
const NOW = Date.now()
const USER = '11111111-2222-4333-8444-555555555555'
function txPayload(over = {}) {
  return {
    transactionId: '2000000001', originalTransactionId: '2000000000', webOrderLineItemId: '1',
    bundleId: 'app.old2new.ios', productId: 'app.old2new.ios.plus.monthly', subscriptionGroupIdentifier: '21500001',
    purchaseDate: NOW - 1000, originalPurchaseDate: NOW - 1000, expiresDate: NOW + 30 * 86400000,
    quantity: 1, type: 'Auto-Renewable Subscription', inAppOwnershipType: 'PURCHASED', signedDate: NOW,
    environment: 'Xcode', transactionReason: 'PURCHASE', storefront: 'USA', storefrontId: '143441', price: 14990, currency: 'USD',
    appAccountToken: USER,
    ...over,
  }
}

// Minimal in-memory stand-in for the Supabase service-role client.
function fakeAdmin({ profiles = {}, appleRows = {}, users = {} } = {}) {
  const state = { profiles, appleRows, users, writes: [] }
  const table = (name) => {
    const q = { _filters: {}, _op: null, _payload: null }
    q.select = () => q
    q.eq = (k, v) => { q._filters[k] = v; return q }
    q.maybeSingle = async () => {
      if (name === 'apple_subscriptions') return { data: state.appleRows[q._filters.original_transaction_id] || null }
      if (name === 'profiles') return { data: state.profiles[q._filters.id] || null }
      return { data: null }
    }
    q.upsert = async (row) => { state.appleRows[row.original_transaction_id] = row; state.writes.push(['upsert', row]); return { error: null } }
    q.update = (payload) => { q._op = 'update'; q._payload = payload; return q }
    q.then = (resolve) => {
      // awaiting `.update().eq()` → apply
      if (q._op === 'update' && name === 'profiles') {
        const id = q._filters.id
        state.profiles[id] = { ...(state.profiles[id] || {}), ...q._payload }
        state.writes.push(['profile', id, q._payload])
      }
      resolve({ error: null, data: null })
    }
    // select over many rows (activeApplePlanForUser)
    const origEq = q.eq
    q.eq = (k, v) => { origEq(k, v); if (name === 'apple_subscriptions' && k === 'user_id') { q.then = (resolve) => resolve({ data: Object.values(state.appleRows).filter(r => r.user_id === v), error: null }) } return q }
    return q
  }
  return {
    state,
    from: table,
    auth: { admin: { getUserById: async (id) => ({ data: { user: state.users[id] ? { id, email: state.users[id] } : null } }) } },
  }
}

describe('environment policy', () => {
  it('production server accepts Sandbox and Production only', () => {
    expect(allowedEnvironments({})).toEqual(['Sandbox', 'Production'])
    expect(() => makeVerifier('Xcode', {})).toThrow(AppleEnvironmentError)
    expect(() => makeVerifier('LocalTesting', { APPLE_ALLOW_XCODE_ENV: '1' })).toThrow(AppleEnvironmentError)
  })
  it('Xcode environment only with the explicit local flag', () => {
    expect(allowedEnvironments({ APPLE_ALLOW_XCODE_ENV: '1' })).toContain('Xcode')
  })
  it('Production requires the numeric App Apple ID', () => {
    expect(() => makeVerifier('Production', {})).toThrow(/APPLE_APP_APPLE_ID/)
    expect(makeVerifier('Production', { APPLE_APP_APPLE_ID: '6740000000' })).toBeTruthy()
    expect(makeVerifier('Sandbox', {})).toBeTruthy()
  })
  it('peeks the environment without trusting it', () => {
    expect(peekJwsPayload(fakeJws(txPayload())).environment).toBe('Xcode')
    expect(peekJwsPayload('garbage')).toBe(null)
  })
})

describe('verifyTransactionJws (Xcode env, local only)', () => {
  const env = { APPLE_ALLOW_XCODE_ENV: '1' }
  it('decodes a StoreKit-testing transaction for our bundle', async () => {
    const tx = await verifyTransactionJws(fakeJws(txPayload()), env)
    expect(tx.productId).toBe('app.old2new.ios.plus.monthly')
    expect(tx.appAccountToken).toBe(USER)
  })
  it('rejects a transaction for another bundle id', async () => {
    await expect(verifyTransactionJws(fakeJws(txPayload({ bundleId: 'com.evil.app' })), env)).rejects.toThrow()
  })
  it('rejects Xcode transactions on the production server', async () => {
    await expect(verifyTransactionJws(fakeJws(txPayload()), {})).rejects.toThrow(AppleEnvironmentError)
  })
})

describe('deriveAppleStatus / rowFromTransaction', () => {
  it('subscribed while unexpired; expired after; grace keeps access', () => {
    expect(deriveAppleStatus(txPayload(), null, null, NOW)).toBe('subscribed')
    expect(deriveAppleStatus(txPayload({ expiresDate: NOW - 1 }), null, null, NOW)).toBe('expired')
    expect(deriveAppleStatus(txPayload({ expiresDate: NOW - 1 }), { gracePeriodExpiresDate: NOW + 1000 }, 'DID_FAIL_TO_RENEW', NOW)).toBe('inGracePeriod')
    expect(deriveAppleStatus(txPayload({ expiresDate: NOW - 1 }), { isInBillingRetryPeriod: true }, 'DID_FAIL_TO_RENEW', NOW)).toBe('inBillingRetry')
  })
  it('refund / revoke', () => {
    expect(deriveAppleStatus(txPayload(), null, 'REFUND', NOW)).toBe('refunded')
    expect(deriveAppleStatus(txPayload({ revocationDate: NOW }), null, null, NOW)).toBe('revoked')
  })
  it('maps product → internal plan and keeps Apple ids as strings', () => {
    const row = rowFromTransaction(txPayload({ productId: 'app.old2new.ios.premium.monthly' }), { autoRenewStatus: 1, autoRenewProductId: 'app.old2new.ios.premium.monthly' }, 'SUBSCRIBED', USER)
    expect(row.plan).toBe('family')
    expect(row.original_transaction_id).toBe('2000000000')
    expect(row.will_auto_renew).toBe(true)
    expect(row.user_id).toBe(USER)
  })
})

describe('applyAppleTransaction', () => {
  let admin
  beforeEach(() => { admin = fakeAdmin({ profiles: { [USER]: { plan: 'free', entitlement_source: null } }, users: { [USER]: 'kim@example.com' } }) })

  it('device verify: grants Plus to the signed-in user and resets usage', async () => {
    const r = await applyAppleTransaction({ admin, stripe: null, tx: txPayload(), requestingUserId: USER })
    expect(r.plan).toBe('wellness'); expect(r.entitlement_source).toBe('apple')
    expect(admin.state.profiles[USER]).toMatchObject({ plan: 'wellness', entitlement_source: 'apple', swaps_used: 0 })
    expect(admin.state.appleRows['2000000000'].user_id).toBe(USER)
  })
  it('notification: finds the user via appAccountToken when no row exists yet', async () => {
    const r = await applyAppleTransaction({ admin, stripe: null, tx: txPayload({ productId: 'app.old2new.ios.premium.monthly' }), notificationType: 'SUBSCRIBED' })
    expect(r.userId).toBe(USER); expect(r.plan).toBe('family')
  })
  it('notification: unknown owner is stored but not applied', async () => {
    const r = await applyAppleTransaction({ admin, stripe: null, tx: txPayload({ appAccountToken: undefined }), notificationType: 'SUBSCRIBED' })
    expect(r.unassigned).toBe(true)
    expect(admin.state.profiles[USER].plan).toBe('free')
  })
  it('refuses to attach a subscription already linked to another account', async () => {
    admin.state.appleRows['2000000000'] = { original_transaction_id: '2000000000', user_id: 'someone-else', plan: 'wellness', status: 'subscribed', expires_at: new Date(NOW + 1e7).toISOString() }
    await expect(applyAppleTransaction({ admin, stripe: null, tx: txPayload(), requestingUserId: USER })).rejects.toThrow(EntitlementOwnershipError)
  })
  it('expiry notification downgrades to free when there is no Stripe plan', async () => {
    await applyAppleTransaction({ admin, stripe: null, tx: txPayload(), requestingUserId: USER })
    const r = await applyAppleTransaction({ admin, stripe: null, tx: txPayload({ transactionId: '2000000002', expiresDate: NOW - 1 }), notificationType: 'EXPIRED' })
    expect(r.plan).toBe('free'); expect(admin.state.profiles[USER].plan).toBe('free')
  })
  it('expiry notification hands over to an active Stripe subscription found live', async () => {
    await applyAppleTransaction({ admin, stripe: null, tx: txPayload(), requestingUserId: USER })
    const stripe = {
      customers: { list: async () => ({ data: [{ id: 'cus_1' }] }) },
      subscriptions: { list: async () => ({ data: [{ items: { data: [{ price: { id: 'price_fam' } }] } }] }) },
    }
    const env = { STRIPE_FAMILY_PRICE_ID: 'price_fam' }
    const r = await applyAppleTransaction({ admin, stripe, tx: txPayload({ transactionId: '2000000002', expiresDate: NOW - 1 }), notificationType: 'EXPIRED', env })
    expect(r.plan).toBe('family'); expect(r.entitlement_source).toBe('stripe')
  })
  it('existing web subscriber (Stripe Premium) is not downgraded by an Apple Plus purchase', async () => {
    admin.state.profiles[USER] = { plan: 'family', entitlement_source: 'stripe' }
    const r = await applyAppleTransaction({ admin, stripe: null, tx: txPayload(), requestingUserId: USER })
    expect(r.plan).toBe('family'); expect(r.entitlement_source).toBe('stripe')
  })
  it('upgrade Plus → Premium via a new transaction in the same group', async () => {
    await applyAppleTransaction({ admin, stripe: null, tx: txPayload(), requestingUserId: USER })
    const r = await applyAppleTransaction({ admin, stripe: null, tx: txPayload({ transactionId: '2000000003', productId: 'app.old2new.ios.premium.monthly' }), notificationType: 'DID_CHANGE_RENEWAL_PREF' })
    expect(r.plan).toBe('family')
  })
  it('ignores products that are not ours', async () => {
    const r = await applyAppleTransaction({ admin, stripe: null, tx: txPayload({ productId: 'app.old2new.ios.gold' }), requestingUserId: USER })
    expect(r.ignored).toBe(true)
  })
})
