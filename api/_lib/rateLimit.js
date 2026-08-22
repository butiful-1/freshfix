// In-memory sliding-window rate limiter, per warm Vercel instance.
// Not durable across cold starts or multiple concurrent instances — the x402
// payment requirement is the real abuse limiter for paid calls (each request
// costs real USDC to reach the model). This just caps cheap pre-payment noise
// (missing/malformed PAYMENT-SIGNATURE probing, invalid-body spam).
const WINDOW_MS = 60_000
const MAX_REQUESTS = 20
const hits = new Map()

export function rateLimit(key, max = MAX_REQUESTS, windowMs = WINDOW_MS) {
  const now = Date.now()
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (now - v.start > windowMs) hits.delete(k)
    }
  }
  const entry = hits.get(key)
  if (!entry || now - entry.start > windowMs) {
    hits.set(key, { start: now, count: 1 })
    return true
  }
  entry.count += 1
  return entry.count <= max
}

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}
