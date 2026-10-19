// The client and server copies of the Google Play product mapping must agree,
// and the Android project must be the billing-enabled build that matches them.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { GOOGLE_IAP_PRODUCTS, GOOGLE_IAP_PRODUCT_IDS, planForGoogleProductId, googleProductForPlan, GOOGLE_PACKAGE_NAME as CLIENT_PKG } from '../src/iap/googleProducts.js'
import { GOOGLE_PRODUCTS, GOOGLE_PRODUCT_IDS, planForGoogleProduct, GOOGLE_PACKAGE_NAME } from '../api/_lib/googleProducts.js'
import { IAP_PRODUCTS } from '../src/iap/products.js'

const root = new URL('../', import.meta.url)
const read = (p) => readFileSync(new URL(p, root), 'utf8')

describe('Google Play product configuration', () => {
  it('client and server product ids and plans match exactly', () => {
    expect([...GOOGLE_IAP_PRODUCT_IDS].sort()).toEqual([...GOOGLE_PRODUCT_IDS].sort())
    for (const id of GOOGLE_IAP_PRODUCT_IDS) expect(planForGoogleProductId(id)).toBe(planForGoogleProduct(id))
    expect(CLIENT_PKG).toBe(GOOGLE_PACKAGE_NAME)
  })
  it('maps to the existing internal plan values, never new ones', () => {
    expect(Object.values(GOOGLE_IAP_PRODUCTS).map(p => p.plan).sort()).toEqual(['family', 'wellness'])
    expect(Object.values(GOOGLE_PRODUCTS).map(p => p.plan).sort()).toEqual(['family', 'wellness'])
    expect(googleProductForPlan('wellness').name).toBe('Plus')
    expect(googleProductForPlan('family').name).toBe('Premium')
    expect(planForGoogleProductId('com.other.thing')).toBe(null)
  })
  it('keeps the same prices and limits as the Apple products', () => {
    for (const plan of ['wellness', 'family']) {
      expect(GOOGLE_IAP_PRODUCTS[plan].fallbackPrice).toBe(IAP_PRODUCTS[plan].fallbackPrice)
      expect(GOOGLE_IAP_PRODUCTS[plan].savedRecipes).toBe(IAP_PRODUCTS[plan].savedRecipes)
      expect(GOOGLE_IAP_PRODUCTS[plan].monthlyTransformations).toBe(IAP_PRODUCTS[plan].monthlyTransformations)
    }
    expect(GOOGLE_IAP_PRODUCTS.wellness.fallbackPrice).toBe('$14.99')
    expect(GOOGLE_IAP_PRODUCTS.family.fallbackPrice).toBe('$24.99')
  })
  it('product ids are valid Google Play product ids', () => {
    for (const id of GOOGLE_IAP_PRODUCT_IDS) expect(id).toMatch(/^[a-z0-9][a-z0-9_.]*$/)
  })
  it('the Android project is the billing-enabled build for this package', () => {
    const gradle = read('twa/android/app/build.gradle')
    expect(gradle).toContain(`applicationId '${GOOGLE_PACKAGE_NAME}'`)
    expect(gradle).toMatch(/com\.google\.androidbrowserhelper:billing:1\.[2-9]\.\d+/)
    expect(gradle).toMatch(/com\.android\.billingclient:billing:(8|9)\.\d+\.\d+/)
    expect(gradle).toMatch(/versionCode (9|[1-9]\d)/)
    const manifest = read('twa/android/app/src/main/AndroidManifest.xml')
    expect(manifest).toContain('com.google.androidbrowserhelper.playbilling.provider.PaymentActivity')
    expect(manifest).toContain('android.support.customtabs.trusted.TRUSTED_WEB_ACTIVITY_SERVICE')
    expect(manifest).toContain('https://play.google.com/billing')
    const twa = JSON.parse(read('twa/twa-manifest.json'))
    expect(twa.packageId).toBe(GOOGLE_PACKAGE_NAME)
    expect(twa.features?.playBilling?.enabled).toBe(true)
    expect(twa.appVersionCode).toBeGreaterThanOrEqual(9)
  })
})
