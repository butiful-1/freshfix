// Medical-claim language guard (App Store 1.4.1).
import { describe, it, expect } from 'vitest'
import {
  findClaimViolations, transformTextFields, checkClaims, enforceClaims, stripClaimSentences, repairClaims, NEUTRAL_WHY,
} from '../api/_lib/claimGuard.js'

describe('findClaimViolations — flags treatment / prevention / safe-for language', () => {
  const bad = [
    'This recipe is safe for diabetics.',
    'Cinnamon helps regulate blood sugar.',
    'These swaps control your blood glucose all day.',
    'Turmeric prevents inflammation and heart disease.',
    'Monk fruit eliminates the blood sugar spike.',
    'Erythritol has zero glycemic impact.',
    'Perfect for everyone taking GLP-1 medication.',
    'Clinically proven to lower cholesterol.',
    "It's nature's pharmacy in a jar.",
    'Capsaicin has well-documented anti-inflammatory effects.',
    'Research suggests vinegar may reduce post-meal blood sugar spikes.',
    'This soup burns fat and boosts your metabolism.',
    'A detox smoothie that will help you lose weight.',
    'Monk fruit and erythritol do not raise insulin levels, making them ideal for insulin resistance management.',
    'Tart cherries contain anthocyanins that may support insulin sensitivity.',
    'Apple cider vinegar has been shown in studies to help blunt post-meal blood sugar rises.',
    'Peas add fiber which slows glucose absorption.',
    'Capsaicin has anti-inflammatory properties.',
    'Oleocanthal is a natural anti-inflammatory compound similar in action to ibuprofen.',
    'Refined oils promote inflammation.',
    'This quartet is the gold standard of anti-inflammatory spicing.',
  ]
  for (const text of bad) {
    it(`flags: ${text}`, () => { expect(findClaimViolations(text).length).toBeGreaterThan(0) })
  }
})

describe('findClaimViolations — allows characteristic language', () => {
  const ok = [
    'Lower in added sugar and higher in fiber than the original.',
    'Whole grain pasta brings more fiber; Greek yogurt adds protein.',
    'Olive oil replaces butter for an unsaturated-fat profile.',
    'Fits a diabetic-friendly eating pattern with more non-starchy vegetables.',
    'Many people following a GLP-1 friendly pattern prefer smaller, protein-forward portions.',
    'Monk fruit is a sugar substitute with a very low glycemic index.',
    'Please consult your doctor or a registered dietitian before making dietary changes.',
    'Cauliflower rice is much lower in carbohydrate than white rice.',
    'Avocado oil is high in monounsaturated (unsaturated) fat and has a high smoke point.',
    'Turmeric, ginger, cinnamon and black pepper are the spices most associated with anti-inflammatory-style eating patterns.',
    'Extra virgin olive oil provides monounsaturated fat in place of saturated fat.',
  ]
  for (const text of ok) {
    it(`allows: ${text}`, () => { expect(findClaimViolations(text)).toEqual([]) })
  }
})

function sampleResult() {
  return {
    whyTheseSwaps: 'We swapped sugar for monk fruit. Monk fruit eliminates the blood sugar spike. Enjoy!',
    encouragement: 'This dish is safe for diabetics and delicious.',
    ingredientSwaps: [{ original: 'sugar', swapped: 'monk fruit', reason: 'lower in added sugar' }, { original: 'butter', swapped: 'olive oil', reason: 'clinically proven to lower cholesterol' }],
    transformedRecipe: { ingredients: [{ item: 'cinnamon', note: 'helps regulate blood sugar' }], instructions: ['Mix well.'] },
  }
}

describe('enforce (deterministic fallback)', () => {
  it('strips only the offending sentences and keeps the rest', () => {
    expect(stripClaimSentences('We swapped sugar for monk fruit. Monk fruit eliminates the blood sugar spike. Enjoy!'))
      .toBe('We swapped sugar for monk fruit. Enjoy!')
  })
  it('falls back to a neutral default when whyTheseSwaps would become empty', () => {
    const r = { whyTheseSwaps: 'Controls blood sugar.' }
    const fields = transformTextFields(r)
    enforceClaims(fields, checkClaims(fields))
    expect(r.whyTheseSwaps).toBe(NEUTRAL_WHY)
  })
  it('scans every user-facing text field of a transform result', () => {
    const r = sampleResult()
    const violations = checkClaims(transformTextFields(r))
    expect(violations.map(v => v.path).sort()).toEqual(['encouragement', 'ingredientSwaps[1].reason', 'ingredients[0].note', 'whyTheseSwaps'])
  })
})

describe('repairClaims', () => {
  it('uses the model rewrite when it is clean, strips what the model left dirty, never throws', async () => {
    const r = sampleResult()
    const fields = transformTextFields(r)
    const violations = checkClaims(fields)
    const client = { messages: { create: async () => ({ content: [{ text: JSON.stringify({ rewrites: [
      { path: 'whyTheseSwaps', text: 'We swapped sugar for monk fruit, which has no added sugar. Enjoy!' },
      { path: 'encouragement', text: 'This dish is safe for diabetics.' }, // still bad → stripped
    ] }) }] }) } }
    const out = await repairClaims(client, fields, violations)
    expect(out.rewritten).toBe(1)
    expect(r.whyTheseSwaps).toBe('We swapped sugar for monk fruit, which has no added sugar. Enjoy!')
    expect(findClaimViolations(r.encouragement)).toEqual([])
    expect(findClaimViolations(r.ingredientSwaps[1].reason)).toEqual([])
    expect(findClaimViolations(r.transformedRecipe.ingredients[0].note)).toEqual([])
  })
  it('works with no client and with a failing client', async () => {
    const r = sampleResult()
    const fields = transformTextFields(r)
    await repairClaims(null, fields, checkClaims(fields))
    expect(checkClaims(transformTextFields(r))).toEqual([])
    const r2 = sampleResult()
    const f2 = transformTextFields(r2)
    await repairClaims({ messages: { create: async () => { throw new Error('boom') } } }, f2, checkClaims(f2))
    expect(checkClaims(transformTextFields(r2))).toEqual([])
  })
})
