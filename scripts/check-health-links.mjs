// Verifies that every URL in src/data/healthSources.js resolves (HTTP < 400,
// following redirects). Run: node scripts/check-health-links.mjs
// Exit code 1 if any link fails, so it can gate a release.
import { HEALTH_SOURCES } from '../src/data/healthSources.js'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 Old2New-link-check'

async function check(url) {
  const opts = { redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html,*/*' }, signal: AbortSignal.timeout(20000) }
  try {
    let r = await fetch(url, { ...opts, method: 'HEAD' })
    if (r.status >= 400) r = await fetch(url, { ...opts, method: 'GET' })
    // PubMed answers 203 to non-browser clients; it is a successful response.
    return { ok: r.status < 400, status: r.status, final: r.url }
  } catch (e) {
    return { ok: false, status: 0, error: e.message }
  }
}

let failed = 0
for (const s of HEALTH_SOURCES) {
  const r = await check(s.url)
  const mark = r.ok ? 'OK ' : 'FAIL'
  if (!r.ok) failed++
  console.log(`${mark} ${String(r.status).padStart(3)}  ${s.id.padEnd(28)} ${s.url}${r.final && r.final !== s.url ? `  → ${r.final}` : ''}${r.error ? `  (${r.error})` : ''}`)
}
console.log(failed ? `\n${failed} link(s) FAILED` : `\nAll ${HEALTH_SOURCES.length} links resolved`)
process.exit(failed ? 1 : 0)
