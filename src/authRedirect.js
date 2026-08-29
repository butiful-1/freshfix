import { Capacitor } from '@capacitor/core'

// Custom URL scheme registered in ios/App/App/Info.plist (CFBundleURLTypes).
// Must also be allowed in Supabase → Authentication → URL Configuration.
export const NATIVE_AUTH_SCHEME = 'old2new'

export function isNativeApp() {
  try { return Capacitor.isNativePlatform() } catch { return false }
}

// Where Supabase should send the user after email confirmation, password
// reset, or OAuth. In the native app the link must re-open the app (not
// Safari) so the PKCE code verifier stored in the app's WebView is available.
export function authCallbackUrl(query = '') {
  if (isNativeApp()) return `${NATIVE_AUTH_SCHEME}://auth/callback${query}`
  const isLocalDev = window.location.protocol !== 'capacitor:' && window.location.hostname === 'localhost'
  return `${isLocalDev ? window.location.origin : 'https://old2new.app'}/auth/callback${query}`
}
