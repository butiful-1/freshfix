// Server-renders the paywall surfaces for the Android (Google Play) store and
// checks the customer-facing requirements: live prices, Google's required
// disclosures, Restore Purchases, no website checkout, and no double-selling
// on top of a plan granted elsewhere.
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import PricingScreen from '../src/components/PricingScreen.jsx'
import UpgradeModal from '../src/components/UpgradeModal.jsx'

const products = [
  { plan: 'wellness', productId: 'old2new_plus_monthly', priceString: '$14.99', price: 14.99, currencyCode: 'USD', period: 'P1M' },
  { plan: 'family', productId: 'old2new_premium_monthly', priceString: '$24.99', price: 24.99, currencyCode: 'USD', period: 'P1M' },
]
const noop = async () => ({})
const text = (el) => renderToStaticMarkup(el).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&')

describe('Android paywall (Google Play)', () => {
  it('free user: both plans with Google Play prices, required disclosures, Restore Purchases, no Stripe', () => {
    const html = renderToStaticMarkup(<PricingScreen plan="free" swapUsage={{ count: 2 }} onBack={noop} user={{ id: 'u' }}
      storeIAP="google" appleProducts={products} onApplePurchase={noop} onRestorePurchases={noop} onManageSubscription={noop} planSource={null} />)
    const t = html.replace(/<[^>]+>/g, ' ')
    expect(t).toContain('$14.99'); expect(t).toContain('$24.99')
    expect(t).toContain('Subscribe to Plus'); expect(t).toContain('Subscribe to Premium')
    expect(t).toContain('Restore Purchases')
    expect(t).toMatch(/auto-renew/i); expect(t).toMatch(/billed .*through Google Play/i)
    expect(t).toMatch(/renews automatically every month/i)
    expect(t).toMatch(/Cancel(ling)?.*Google Play/i)
    expect(t).toContain('1 month')
    expect(t).not.toMatch(/Stripe/); expect(t).not.toMatch(/Apple Account/)
    expect(html).not.toContain('create-checkout')
  })
  it('Google subscriber on Plus: Switch to Premium offered, Manage Subscription shown', () => {
    const t = text(<PricingScreen plan="wellness" swapUsage={{ count: 0 }} onBack={noop} user={{ id: 'u' }}
      storeIAP="google" appleProducts={products} onApplePurchase={noop} onRestorePurchases={noop} onManageSubscription={noop} planSource="google" />)
    expect(t).toContain('Switch to Premium'); expect(t).toContain('Manage Subscription'); expect(t).toContain('Active')
  })
  it('plan granted elsewhere (Stripe / Apple / complimentary) is never sold again on Android', () => {
    for (const [source, needle] of [['stripe', 'billed on old2new.app'], ['apple', 'billed through Apple'], ['manual', 'complimentary']]) {
      const t = text(<PricingScreen plan="family" swapUsage={{ count: 0 }} onBack={noop} user={{ id: 'u' }}
        storeIAP="google" appleProducts={products} onApplePurchase={noop} onRestorePurchases={noop} onManageSubscription={noop} planSource={source} />)
      expect(t).not.toContain('Switch to'); expect(t).toContain(needle); expect(t).toContain('Restore Purchases')
    }
  })
  it('iOS paywall copy is unchanged for the Apple store', () => {
    const t = text(<PricingScreen plan="free" swapUsage={{ count: 0 }} onBack={noop} user={{ id: 'u' }}
      appleIAP appleProducts={products} onApplePurchase={noop} onRestorePurchases={noop} onManageSubscription={noop} planSource={null} />)
    expect(t).toContain('Apple Account'); expect(t).not.toMatch(/Google Play/)
  })
  it('web (no store) still uses Stripe checkout copy', () => {
    const t = text(<PricingScreen plan="free" swapUsage={{ count: 0 }} onBack={noop} user={{ id: 'u' }} />)
    expect(t).toContain('Billed monthly via Stripe'); expect(t).not.toContain('Restore Purchases')
  })
  it('UpgradeModal: Android build with billing sells via Google Play; Android build without billing sells nothing', () => {
    const withBilling = text(<UpgradeModal isTWA storeIAP="google" appleProducts={products} onApplePurchase={noop} onRestorePurchases={noop} onClose={noop} onViewPlans={noop} swapUsage={{ count: 5 }} />)
    expect(withBilling).toContain('$14.99/mo'); expect(withBilling).toContain('$24.99/mo')
    expect(withBilling).toMatch(/billed through Google Play/i); expect(withBilling).toContain('Restore Purchases')
    const without = text(<UpgradeModal isTWA appleIAP={false} onClose={noop} onViewPlans={noop} swapUsage={{ count: 5 }} />)
    expect(without).not.toContain('$14.99'); expect(without).toContain('Come back next month')
  })
})
