// Reads (and, with --fix, corrects) the App Store Server Notification
// configuration for the app with bundle ID app.old2new.ios through the App
// Store Connect API. Nothing else is touched.
//
// Usage:
//   ASC_KEY_ID=XXXXXXXXXX ASC_ISSUER_ID=<uuid> ASC_PRIVATE_KEY_PATH=~/.appstoreconnect/private_keys/AuthKey_XXXXXXXXXX.p8 \
//     node scripts/asc-notifications.mjs            # report only
//     node scripts/asc-notifications.mjs --fix      # also set both versions to V2, URLs preserved
//
// The key is read from disk at run time and never printed or stored anywhere.
import { readFileSync } from 'node:fs'
import { createSign, createPrivateKey } from 'node:crypto'
import { homedir } from 'node:os'

const BUNDLE_ID = 'app.old2new.ios'
const API = 'https://api.appstoreconnect.apple.com'
const FIX = process.argv.includes('--fix')

const keyId = process.env.ASC_KEY_ID
const issuerId = process.env.ASC_ISSUER_ID
const keyPath = (process.env.ASC_PRIVATE_KEY_PATH || '').replace(/^~/, homedir())
if (!keyId || !issuerId || !keyPath) {
  console.error('Set ASC_KEY_ID, ASC_ISSUER_ID and ASC_PRIVATE_KEY_PATH (path to the AuthKey_<KEYID>.p8 file).')
  process.exit(2)
}

const b64url = (s) => Buffer.from(s).toString('base64url')
function jwt() {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }))
  const payload = b64url(JSON.stringify({ iss: issuerId, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' }))
  const signer = createSign('SHA256')
  signer.update(`${header}.${payload}`)
  const key = createPrivateKey(readFileSync(keyPath))
  const sig = signer.sign({ key, dsaEncoding: 'ieee-p1363' })
  return `${header}.${payload}.${sig.toString('base64url')}`
}

async function asc(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  const text = await res.text()
  let body; try { body = JSON.parse(text) } catch { body = text }
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${path} → ${res.status}: ${typeof body === 'string' ? body : JSON.stringify(body.errors || body)}`)
  return body
}

const FIELDS = ['subscriptionStatusUrl', 'subscriptionStatusUrlVersion', 'subscriptionStatusUrlForSandbox', 'subscriptionStatusUrlVersionForSandbox']

const apps = await asc(`/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&fields[apps]=name,bundleId,${FIELDS.join(',')}`)
const app = apps.data?.[0]
if (!app) { console.error(`No app with bundle ID ${BUNDLE_ID} is visible to this key.`); process.exit(1) }

const show = (a) => { for (const f of FIELDS) console.log(`${f.padEnd(40)} ${a[f] ?? '(not set)'}`) }
console.log(`App: ${app.attributes.name} (${app.attributes.bundleId}) id=${app.id}\n`)
show(app.attributes)

const needs = {}
if (app.attributes.subscriptionStatusUrlVersion !== 'V2') needs.subscriptionStatusUrlVersion = 'V2'
if (app.attributes.subscriptionStatusUrlVersionForSandbox !== 'V2') needs.subscriptionStatusUrlVersionForSandbox = 'V2'

if (Object.keys(needs).length === 0) { console.log('\nBoth notification versions are already V2. Nothing to change.'); process.exit(0) }
if (!FIX) { console.log(`\nWould change: ${JSON.stringify(needs)} (URLs untouched). Re-run with --fix to apply.`); process.exit(0) }

const patched = await asc(`/v1/apps/${app.id}`, {
  method: 'PATCH',
  body: JSON.stringify({ data: { type: 'apps', id: app.id, attributes: needs } }),
})
console.log('\nUpdated. Current values:')
show(patched.data.attributes)
