import { isNativeApp } from './authRedirect'

// In the native app the WebView origin is capacitor://localhost, so relative
// '/api/...' URLs would hit the bundled assets, not Vercel. Point them at
// production. On the web (and in Vite dev) relative URLs are unchanged.
const PROD_ORIGIN = 'https://old2new.app'
// Debug-only override (e.g. VITE_API_ORIGIN=http://192.168.1.20:3001 in
// .env.local) so a simulator build can talk to the local dev server for
// StoreKit-testing verification. Never set in production builds.
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || PROD_ORIGIN
// Narrower debug override for ONLY the Apple IAP endpoints, so a simulator
// build can keep using production for transforms while StoreKit-testing
// transactions (unsigned, "Xcode" environment) are verified by the local
// server. Never set in production builds.
const APPLE_API_ORIGIN = import.meta.env.VITE_APPLE_API_ORIGIN || API_ORIGIN
export function apiUrl(path) {
  if (!isNativeApp()) return path
  const origin = path.startsWith('/api/apple/') ? APPLE_API_ORIGIN : API_ORIGIN
  return `${origin}${path}`
}

// Large marketing/blog images are not bundled in the native app (see
// scripts/sync-ios.mjs) — load them from production there instead.
export function assetUrl(path) {
  return isNativeApp() && path?.startsWith('/') ? `${PROD_ORIGIN}${path}` : path
}
