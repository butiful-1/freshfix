// Shared fakes for the Google Play tests: a SubscriptionPurchaseV2 payload
// builder, an in-memory Supabase service-role client and a fake Play API.
const NOW = Date.now()
const iso = (ms) => new Date(ms).toISOString()

export function purchaseV2(over = {}) {
  const { productId = 'old2new_plus_monthly', expiry = NOW + 30 * 86400000, state = 'SUBSCRIPTION_STATE_ACTIVE', ack = 'ACKNOWLEDGEMENT_STATE_PENDING', autoRenew = true, deferredProductId, linkedPurchaseToken, ...rest } = over
  const item = {
    productId, expiryTime: iso(expiry), latestSuccessfulOrderId: 'GPA.1234-5678',
    autoRenewingPlan: { autoRenewEnabled: autoRenew, recurringPrice: { currencyCode: 'USD', units: '14', nanos: 990000000 } },
    offerDetails: { basePlanId: 'monthly' },
  }
  if (deferredProductId) item.deferredItemReplacement = { productId: deferredProductId }
  return {
    kind: 'androidpublisher#subscriptionPurchaseV2', regionCode: 'US', startTime: iso(NOW - 1000),
    subscriptionState: state, acknowledgementState: ack, latestOrderId: 'GPA.1234-5678',
    ...(linkedPurchaseToken ? { linkedPurchaseToken } : {}),
    lineItems: [item],
    ...rest,
  }
}

// Minimal in-memory stand-in for the Supabase service-role client covering
// the three tables the Google path touches.
export function fakeAdmin({ profiles = {}, googleRows = {}, appleRows = {}, users = {} } = {}) {
  const state = { profiles, googleRows, appleRows, users, writes: [] }
  const tables = { google_subscriptions: ['purchase_token', state.googleRows], apple_subscriptions: ['original_transaction_id', state.appleRows], profiles: ['id', state.profiles] }
  const from = (name) => {
    const [pk, store] = tables[name]
    const q = { _filters: {}, _op: null, _payload: null }
    const matches = () => Object.entries(store).filter(([k, row]) => Object.entries(q._filters).every(([fk, fv]) => (fk === pk ? k === fv : row[fk] === fv)))
    q.select = () => q
    q.eq = (k, v) => { q._filters[k] = v; return q }
    q.maybeSingle = async () => ({ data: matches()[0]?.[1] || null, error: null })
    q.upsert = async (row) => { store[row[pk]] = { ...(store[row[pk]] || {}), ...row }; state.writes.push(['upsert', name, row]); return { error: null } }
    q.update = (payload) => { q._op = 'update'; q._payload = payload; return q }
    q.then = (resolve) => {
      if (q._op === 'update') {
        for (const [k] of matches()) { store[k] = { ...store[k], ...q._payload }; state.writes.push([name === 'profiles' ? 'profile' : 'update', name === 'profiles' ? k : name, q._payload, k]) }
        return resolve({ error: null, data: null })
      }
      return resolve({ data: matches().map(([, r]) => r), error: null })
    }
    return q
  }
  return { state, from, auth: { admin: { getUserById: async (id) => ({ data: { user: state.users[id] ? { id, email: state.users[id] } : null } }) } } }
}

export function fakePlay() {
  const acks = []
  return { acks, acknowledge: async (productId, token) => { acks.push([productId, token]) }, getSubscription: async () => { throw new Error('not used') } }
}
