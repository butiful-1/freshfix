// Old2New aggregate metrics endpoint — read-only funnel summary for the
// Butters Command Center.
//
// Design: METRICS_READONLY_DESIGN.md (Option C). The privileged aggregation
// happens here, inside the arm that owns the data. The caller receives six
// aggregate figures and never holds a Supabase credential.
//
// Fails closed: if METRICS_API_SECRET or the Supabase service credentials are
// unset, every request returns 503 and no database work is performed.
//
// No error path ever returns a `metrics` object — a genuine zero and a failure
// must never look the same to the caller.
//
// Errors are logged as a sanitized status only. Upstream error detail is never
// logged, returned, or otherwise allowed to cross the Old2New boundary.

import { createClient } from '@supabase/supabase-js'
import { randomUUID, timingSafeEqual, createHash } from 'crypto'

export const config = { maxDuration: 15 }

const PAGE_SIZE = 1000
const MAX_PAGES = 50            // 50k profiles ceiling; beyond this, error rather than under-report
const PLANS = ['free', 'wellness', 'family']

function fail(res, status, error, message, requestId) {
  return res.status(status).json({ ok: false, status: error, message, requestId })
}

// Hash both sides so the compare is fixed-length and leaks neither content nor length.
function secretMatches(provided, expected) {
  if (typeof provided !== 'string' || !provided) return false
  const a = createHash('sha256').update(provided).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7)   // 'YYYY-MM'
}

export default async function handler(req, res) {
  const requestId = randomUUID()
  const startedAt = Date.now()

  // Set first so it applies to every response, including 405/503/401/502.
  // Funnel figures must never be cached by Vercel's CDN or any intermediary.
  res.setHeader('Cache-Control', 'no-store')

  // Server-to-server only. No CORS headers are set, deliberately — a browser
  // page cannot read a cross-origin response without them. The secret is the
  // actual gate; this is a signal of intent, not a security control.
  if (req.method !== 'POST') {
    return fail(res, 405, 'method_not_allowed', 'Use POST.', requestId)
  }

  const secret      = process.env.METRICS_API_SECRET
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!secret || !supabaseUrl || !supabaseKey) {
    console.log(`[metrics ${requestId}] not_enabled`)
    return fail(res, 503, 'not_enabled', 'The metrics endpoint is not enabled in this environment.', requestId)
  }

  if (!secretMatches(req.headers['x-metrics-key'], secret)) {
    console.warn(`[metrics ${requestId}] unauthorized`)
    return fail(res, 401, 'unauthorized', 'A valid X-Metrics-Key header is required.', requestId)
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Authoritative row counts, independent of any page limit.
    const [profileCountRes, recipeCountRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('saved_recipes').select('id', { count: 'exact', head: true }),
    ])
    if (profileCountRes.error) throw new Error('count_query_failed')
    if (recipeCountRes.error)  throw new Error('count_query_failed')

    const totalUsers        = profileCountRes.count || 0
    const totalRecipesSaved = recipeCountRes.count  || 0

    // Page through only the columns the derived metrics need. PostgREST caps
    // rows per response, so a single unpaged select silently truncates once the
    // table grows past that cap — under-reporting with no error raised.
    //
    // `.order('id')` makes paging deterministic: without a stable sort, row
    // order across requests is not guaranteed and pages could overlap or skip.
    // Ordering is applied server-side by PostgREST, so `id` is NOT included in
    // the select list and never enters this function's memory or any response.
    const rows = []
    for (let page = 0; page < MAX_PAGES; page++) {
      const from = page * PAGE_SIZE
      const { data, error } = await supabase
        .from('profiles')
        .select('plan, swaps_used, swaps_month, created_at')
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw new Error('page_query_failed')
      if (!data || data.length === 0) break
      rows.push(...data)
      if (data.length < PAGE_SIZE) break
    }

    // Refuse to report rather than report low.
    if (rows.length !== totalUsers) {
      console.error(`[metrics ${requestId}] upstream_error in ${Date.now() - startedAt}ms`)
      return fail(res, 502, 'upstream_error', 'Could not read a complete result set.', requestId)
    }

    const monthKey = currentMonthKey()
    const now = Date.now()
    const DAY = 24 * 60 * 60 * 1000

    const planCounts = { free: 0, wellness: 0, family: 0 }
    let swapsThisMonth = 0
    let signups24h = 0
    let signups7d = 0

    for (const p of rows) {
      if (PLANS.includes(p.plan)) planCounts[p.plan]++
      if (p.swaps_month === monthKey) swapsThisMonth += p.swaps_used || 0

      const createdAtMs = Date.parse(p.created_at)
      const ageMs = now - createdAtMs

      if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= DAY) signups24h++
      if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= 7 * DAY) signups7d++
    }

    console.log(`[metrics ${requestId}] live in ${Date.now() - startedAt}ms`)

    return res.status(200).json({
      ok: true,
      status: 'live',
      requestId,
      asOf: new Date().toISOString(),
      metrics: {
        totalUsers,
        signups24h,
        signups7d,
        swapsThisMonth,
        totalRecipesSaved,
        planCounts,
        paidUsers: planCounts.wellness + planCounts.family,
      },
      notes: { planSource: 'stripe_webhook_mirror' },
    })
  } catch {
    console.error(`[metrics ${requestId}] upstream_error in ${Date.now() - startedAt}ms`)
    return fail(res, 502, 'upstream_error', 'Could not read metrics.', requestId)
  }
}
