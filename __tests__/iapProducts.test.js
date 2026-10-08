// The client and server copies of the Apple product mapping must agree.
import { describe, it, expect } from 'vitest'
import { IAP_PRODUCTS, IAP_PRODUCT_IDS, planForProductId, productForPlan, SUBSCRIPTION_GROUP_NAME } from '../src/iap/products.js'
import { APPLE_PRODUCTS, APPLE_PRODUCT_IDS, planForAppleProduct, APPLE_BUNDLE_ID } from '../api/_lib/appleProducts.js'
import { readFileSync } from 'node:fs'

describe('Apple product configuration', () => {
  it('client and server product ids and plans match exactly', () => {
    expect([...IAP_PRODUCT_IDS].sort()).toEqual([...APPLE_PRODUCT_IDS].sort())
    for (const id of IAP_PRODUCT_IDS) expect(planForProductId(id)).toBe(planForAppleProduct(id))
  })
  it('maps to the existing internal plan values, never new ones', () => {
    expect(Object.values(IAP_PRODUCTS).map(p => p.plan).sort()).toEqual(['family', 'wellness'])
    expect(Object.values(APPLE_PRODUCTS).map(p => p.plan).sort()).toEqual(['family', 'wellness'])
    expect(productForPlan('wellness').name).toBe('Plus')
    expect(productForPlan('family').name).toBe('Premium')
  })
  it('product ids are namespaced under the bundle id', () => {
    for (const id of IAP_PRODUCT_IDS) expect(id.startsWith(APPLE_BUNDLE_ID + '.')).toBe(true)
    expect(planForProductId('com.other.thing')).toBe(null)
  })
  it('the local StoreKit configuration file contains exactly these products in one group', () => {
    const cfg = JSON.parse(readFileSync(new URL('../ios/App/App/Old2New.storekit', import.meta.url), 'utf8'))
    expect(cfg.subscriptionGroups).toHaveLength(1)
    const group = cfg.subscriptionGroups[0]
    expect(group.name).toBe(SUBSCRIPTION_GROUP_NAME)
    expect(group.subscriptions.map(s => s.productID).sort()).toEqual([...IAP_PRODUCT_IDS].sort())
    const premium = group.subscriptions.find(s => s.productID === IAP_PRODUCTS.family.productId)
    const plus = group.subscriptions.find(s => s.productID === IAP_PRODUCTS.wellness.productId)
    expect(premium.displayPrice).toBe('24.99')
    expect(plus.displayPrice).toBe('14.99')
    expect(premium.groupNumber).toBeLessThan(plus.groupNumber) // Premium ranks higher
    for (const s of group.subscriptions) expect(s.recurringSubscriptionPeriod).toBe('P1M')
  })
})
