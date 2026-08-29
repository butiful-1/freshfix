import { isNativeApp } from './authRedirect'

// In the native app the WebView origin is capacitor://localhost, so relative
// '/api/...' URLs would hit the bundled assets, not Vercel. Point them at
// production. On the web (and in Vite dev) relative URLs are unchanged.
const PROD_ORIGIN = 'https://old2new.app'
export function apiUrl(path) {
  return isNativeApp() ? `${PROD_ORIGIN}${path}` : path
}

// Large marketing/blog images are not bundled in the native app (see
// scripts/sync-ios.mjs) — load them from production there instead.
export function assetUrl(path) {
  return isNativeApp() && path?.startsWith('/') ? `${PROD_ORIGIN}${path}` : path
}
