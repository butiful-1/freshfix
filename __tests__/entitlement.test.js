// Stripe ↔ Apple entitlement reconciliation rules (api/_lib/entitlement.js).
import { describe, it, expect } from 'vitest'
import {
  resolvePlan, nextProfileForApple, nextProfileForStripe, appleRowIsActive, stripePlanFromProfile, PLAN_LEVEL,
} from '../api/_lib/entitlement.js'

describe('resolvePlan — highest active tier wins', () => {
  it('free when nothing is active', () => {
    expect(resolvePlan({})).toEqual({ plan: 'free', source: null })
    expect(resolvePlan({ applePlan: null, stripePlan: 'free' })).toEqual({ plan: 'free', source: null })
  })
  it('apple only', () => {
    expect(resolvePlan({ applePlan: 'wellness' })).toEqual({ plan: 'wellness', source: 'apple' })
  })
  it('stripe only', () => {
    expect(resolvePlan({ stripePlan: 'family' })).toEqual({ plan: 'family', source: 'stripe' })
  })
  it('both active: higher tier wins, apple preferred on tie', () => {
    expect(resolvePlan({ applePlan: 'wellness', stripePlan: 'family' })).toEqual({ plan: 'family', source: 'stripe' })
    expect(resolvePlan({ applePlan: 'family', stripePlan: 'wellness' })).toEqual({ plan: 'family', source: 'apple' })
    expect(resolvePlan({ applePlan: 'wellness', stripePlan: 'wellness' })).toEqual({ plan: 'wellness', source: 'apple' })
  })
  it('ignores unknown plan values', () => {
    expect(resolvePlan({ applePlan: 'gold', stripePlan: 'x' })).toEqual({ plan: 'free', source: null })
  })
})

describe('stripePlanFromProfile — legacy rows count as Stripe', () => {
  it('legacy paid row with null source is a Stripe entitlement', () => {
    expect(stripePlanFromProfile({ plan: 'wellness', entitlement_source: null })).toBe('wellness')
  })
  it('apple-sourced row is not a Stripe entitlement', () => {
    expect(stripePlanFromProfile({ plan: 'family', entitlement_source: 'apple' })).toBe(null)
  })
  it('a live lookup overrides the stored assumption', () => {
    expect(stripePlanFromProfile({ plan: 'wellness', entitlement_source: 'stripe' }, null)).toBe(null)
    expect(stripePlanFromProfile({ plan: 'free', entitlement_source: null }, 'family')).toBe('family')
  })
})

describe('nextProfileForApple', () => {
  it('free user buys Plus → wellness/apple, usage reset', () => {
    expect(nextProfileForApple({ plan: 'free', entitlement_source: null }, { applePlan: 'wellness' }))
      .toEqual({ plan: 'wellness', entitlement_source: 'apple', resetUsage: true })
  })
  it('renewal of the same tier does not reset usage', () => {
    expect(nextProfileForApple({ plan: 'wellness', entitlement_source: 'apple' }, { applePlan: 'wellness' }))
      .toEqual({ plan: 'wellness', entitlement_source: 'apple', resetUsage: false })
  })
  it('upgrade Plus→Premium resets usage; downgrade does not', () => {
    expect(nextProfileForApple({ plan: 'wellness', entitlement_source: 'apple' }, { applePlan: 'family' }).resetUsage).toBe(true)
    expect(nextProfileForApple({ plan: 'family', entitlement_source: 'apple' }, { applePlan: 'wellness' }))
      .toEqual({ plan: 'wellness', entitlement_source: 'apple', resetUsage: false })
  })
  it('apple expiry with no Stripe → free', () => {
    expect(nextProfileForApple({ plan: 'wellness', entitlement_source: 'apple' }, { applePlan: null, liveStripePlan: null }))
      .toEqual({ plan: 'free', entitlement_source: null, resetUsage: false })
  })
  it('apple expiry but live Stripe active → Stripe plan takes over', () => {
    expect(nextProfileForApple({ plan: 'family', entitlement_source: 'apple' }, { applePlan: null, liveStripePlan: 'wellness' }))
      .toEqual({ plan: 'wellness', entitlement_source: 'stripe', resetUsage: false })
  })
  it('existing web (Stripe) subscriber who also buys on Apple keeps the higher tier', () => {
    expect(nextProfileForApple({ plan: 'family', entitlement_source: 'stripe' }, { applePlan: 'wellness' }))
      .toEqual({ plan: 'family', entitlement_source: 'stripe', resetUsage: false })
    expect(nextProfileForApple({ plan: 'wellness', entitlement_source: 'stripe' }, { applePlan: 'family' }))
      .toEqual({ plan: 'family', entitlement_source: 'apple', resetUsage: true })
  })
  it('legacy paid row (null source) is preserved when Apple reports an expired sub', () => {
    expect(nextProfileForApple({ plan: 'wellness', entitlement_source: null }, { applePlan: null }))
      .toEqual({ plan: 'wellness', entitlement_source: 'stripe', resetUsage: false })
  })
})

describe('protected manual (reviewer) entitlement', () => {
  const reviewer = { plan: 'family', entitlement_source: 'manual' }
  it('is never changed by Apple events', () => {
    expect(nextProfileForApple(reviewer, { applePlan: 'wellness' })).toEqual({ plan: 'family', entitlement_source: 'manual', resetUsage: false })
    expect(nextProfileForApple(reviewer, { applePlan: null, liveStripePlan: null })).toEqual({ plan: 'family', entitlement_source: 'manual', resetUsage: false })
  })
  it('is never changed by Stripe events', () => {
    expect(nextProfileForStripe(reviewer, { stripePlan: null, applePlan: null })).toEqual({ plan: 'family', entitlement_source: 'manual', resetUsage: false })
    expect(nextProfileForStripe(reviewer, { stripePlan: 'wellness', applePlan: null })).toEqual({ plan: 'family', entitlement_source: 'manual', resetUsage: false })
  })
  it('does not leak to other rows: a normal Stripe row still reconciles', () => {
    expect(nextProfileForStripe({ plan: 'family', entitlement_source: 'stripe' }, { stripePlan: null, applePlan: null }).plan).toBe('free')
  })
})

describe('nextProfileForStripe', () => {
  it('Stripe checkout for a free user', () => {
    expect(nextProfileForStripe({ plan: 'free' }, { stripePlan: 'wellness', applePlan: null }))
      .toEqual({ plan: 'wellness', entitlement_source: 'stripe', resetUsage: true })
  })
  it('Stripe subscription deleted while Apple is active → keep Apple plan (never wipe it)', () => {
    expect(nextProfileForStripe({ plan: 'wellness', entitlement_source: 'stripe' }, { stripePlan: null, applePlan: 'wellness' }))
      .toEqual({ plan: 'wellness', entitlement_source: 'apple', resetUsage: false })
  })
  it('Stripe subscription deleted with no Apple → free', () => {
    expect(nextProfileForStripe({ plan: 'family', entitlement_source: 'stripe' }, { stripePlan: null, applePlan: null }))
      .toEqual({ plan: 'free', entitlement_source: null, resetUsage: false })
  })
})

describe('appleRowIsActive', () => {
  const now = Date.parse('2026-10-08T12:00:00Z')
  const future = '2026-11-08T12:00:00Z', past = '2026-09-08T12:00:00Z'
  it('active while expires_at is in the future', () => {
    expect(appleRowIsActive({ status: 'subscribed', expires_at: future }, now)).toBe(true)
  })
  it('inactive after expiry', () => {
    expect(appleRowIsActive({ status: 'expired', expires_at: past }, now)).toBe(false)
  })
  it('grace period keeps access', () => {
    expect(appleRowIsActive({ status: 'inGracePeriod', expires_at: past, grace_period_expires_at: future }, now)).toBe(true)
  })
  it('revoked / refunded never grant access even if expires_at is future', () => {
    expect(appleRowIsActive({ status: 'revoked', expires_at: future }, now)).toBe(false)
    expect(appleRowIsActive({ status: 'refunded', expires_at: future }, now)).toBe(false)
  })
  it('plan levels are ordered', () => {
    expect(PLAN_LEVEL.free < PLAN_LEVEL.wellness && PLAN_LEVEL.wellness < PLAN_LEVEL.family).toBe(true)
  })
})
