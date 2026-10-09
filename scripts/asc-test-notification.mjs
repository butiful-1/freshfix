// Requests an App Store Server Notifications V2 TEST notification for the
// SANDBOX environment and reports Apple's delivery result. Read-only apart
// from the test notification itself; touches nothing in App Store Connect.
//
// Usage:
//   IAP_KEY_ID=XXXXXXXXXX IAP_ISSUER_ID=<uuid> IAP_PRIVATE_KEY_PATH=~/.appstoreconnect/private_keys/SubscriptionKey_XXXXXXXXXX.p8 \
//     node scripts/asc-test-notification.mjs
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { AppStoreServerAPIClient, Environment } from '@apple/app-store-server-library'

const BUNDLE_ID = 'app.old2new.ios'
const keyId = process.env.IAP_KEY_ID
const issuerId = process.env.IAP_ISSUER_ID
const keyPath = (process.env.IAP_PRIVATE_KEY_PATH || '').replace(/^~/, homedir())
if (!keyId || !issuerId || !keyPath) {
  console.error('Set IAP_KEY_ID, IAP_ISSUER_ID and IAP_PRIVATE_KEY_PATH.')
  process.exit(2)
}

const client = new AppStoreServerAPIClient(readFileSync(keyPath, 'utf8'), keyId, issuerId, BUNDLE_ID, Environment.SANDBOX)

const { testNotificationToken } = await client.requestTestNotification()
console.log(`Apple accepted the request. token=${testNotificationToken.slice(0, 12)}…`)

// Apple delivers asynchronously; poll the status endpoint for the attempt log.
let status
for (let i = 0; i < 12; i++) {
  await new Promise(r => setTimeout(r, 5000))
  try {
    status = await client.getTestNotificationStatus(testNotificationToken)
  } catch (e) {
    console.log(`  poll ${i + 1}: ${e.apiError ?? ''} ${e.message}`)
    continue
  }
  const attempts = status.sendAttempts || []
  console.log(`  poll ${i + 1}: ${attempts.length} attempt(s) ${attempts.map(a => `${a.sendAttemptResult}@${new Date(a.attemptDate).toISOString()}`).join(', ')}`)
  if (attempts.some(a => a.sendAttemptResult === 'SUCCESS')) break
}

if (!status) { console.error('No status returned from Apple.'); process.exit(1) }
const attempts = status.sendAttempts || []
const ok = attempts.some(a => a.sendAttemptResult === 'SUCCESS')
console.log(`\nDelivery: ${ok ? 'SUCCESS — Apple reports our endpoint answered 2xx' : 'NOT (yet) successful'}`)
console.log(`Attempts: ${JSON.stringify(attempts)}`)
if (status.signedPayload) {
  const payload = JSON.parse(Buffer.from(status.signedPayload.split('.')[1], 'base64url').toString('utf8'))
  console.log(`Payload: type=${payload.notificationType} env=${payload.data?.environment} bundle=${payload.data?.bundleId} appAppleId=${payload.data?.appAppleId} uuid=${payload.notificationUUID}`)
}
process.exit(ok ? 0 : 1)
