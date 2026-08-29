import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { supabase } from './supabase'

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

// Google OAuth. Google rejects sign-in inside embedded WebViews
// (403 disallowed_useragent), so in the native app we open Supabase's OAuth
// URL in the system browser sheet (SFSafariViewController) instead of
// navigating the WebView. Google → Supabase → old2new://auth/callback?code=…
// brings the user back into the app, where the PKCE verifier lives.
// On the web this is the plain redirect flow.
export async function startGoogleSignIn() {
  const native = isNativeApp()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: authCallbackUrl(), skipBrowserRedirect: native },
  })
  if (error) throw error
  if (native && data?.url) await Browser.open({ url: data.url })
}

// Dismiss the system browser sheet once a deep link brings us back.
export function closeNativeBrowser() {
  if (!isNativeApp()) return
  Browser.close().catch(() => {})
}
