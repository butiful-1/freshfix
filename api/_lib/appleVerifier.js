// Verification of Apple-signed data (StoreKit 2 JWS transactions, renewal info
// and App Store Server Notifications V2) using Apple's own library and Apple's
// public root certificates. No private key is involved: the .p8 In-App
// Purchase key is only needed for the App Store Server API (see
// appleServerApi.js), not for verifying signatures.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SignedDataVerifier, Environment } from '@apple/app-store-server-library'
import { APPLE_BUNDLE_ID } from './appleProducts.js'

const here = dirname(fileURLToPath(import.meta.url))

let rootsCache = null
export function appleRootCertificates() {
  if (!rootsCache) {
    rootsCache = ['AppleRootCA-G3.cer', 'AppleRootCA-G2.cer', 'AppleIncRootCertificate.cer']
      .map(f => readFileSync(join(here, 'apple-roots', f)))
  }
  return rootsCache
}

// Peek at an unverified JWS payload (used only to pick the environment; the
// payload is then verified for real against that environment).
export function peekJwsPayload(jws) {
  try {
    const part = String(jws).split('.')[1]
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

// Which environments this server will accept. Production Vercel only ever
// sees Sandbox (App Review, TestFlight, sandbox testers) and Production.
// 'Xcode' (local StoreKit configuration file) is unsigned and is only accepted
// when APPLE_ALLOW_XCODE_ENV=1 — set in the local dev server, never on Vercel.
export function allowedEnvironments(env = process.env) {
  const list = [Environment.SANDBOX, Environment.PRODUCTION]
  if (env.APPLE_ALLOW_XCODE_ENV === '1') list.push(Environment.XCODE)
  return list
}

export class AppleEnvironmentError extends Error {}

export function makeVerifier(environment, env = process.env) {
  if (!allowedEnvironments(env).includes(environment)) {
    throw new AppleEnvironmentError(`Apple environment "${environment}" is not accepted by this server`)
  }
  let appAppleId
  if (environment === Environment.PRODUCTION) {
    appAppleId = Number(env.APPLE_APP_APPLE_ID)
    if (!appAppleId) {
      throw new AppleEnvironmentError('APPLE_APP_APPLE_ID is not configured; production transactions cannot be verified')
    }
  }
  // enableOnlineChecks=true: certificate revocation + validity at verification time.
  return new SignedDataVerifier(appleRootCertificates(), true, environment, APPLE_BUNDLE_ID, appAppleId)
}

export async function verifyTransactionJws(jws, env = process.env) {
  const peek = peekJwsPayload(jws)
  if (!peek?.environment) throw new AppleEnvironmentError('Not a transaction JWS')
  const verifier = makeVerifier(peek.environment, env)
  return verifier.verifyAndDecodeTransaction(jws)
}

export async function verifyRenewalJws(jws, environment, env = process.env) {
  return makeVerifier(environment, env).verifyAndDecodeRenewalInfo(jws)
}

export async function verifyNotificationJws(signedPayload, env = process.env) {
  const peek = peekJwsPayload(signedPayload)
  const environment = peek?.data?.environment || peek?.summary?.environment || peek?.externalPurchaseToken?.environment
    || (peek?.externalPurchaseToken ? (String(peek.externalPurchaseToken.externalPurchaseId || '').startsWith('SANDBOX') ? Environment.SANDBOX : Environment.PRODUCTION) : null)
  if (!environment) throw new AppleEnvironmentError('Not a notification JWS')
  const verifier = makeVerifier(environment, env)
  const decoded = await verifier.verifyAndDecodeNotification(signedPayload)
  return { decoded, verifier, environment }
}

export { Environment }
