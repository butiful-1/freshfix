import { Capacitor } from '@capacitor/core'

// The native iOS app (Capacitor WebView). Distinct from the Android app, which
// is a Trusted Web Activity of the website and is detected via `isTWA`.
export function isIOSNative() {
  try { return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' } catch { return false }
}
