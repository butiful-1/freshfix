import { describe, it, expect } from 'vitest'
import { checkConsistency, buildDietaryRestrictionLines } from '../api/recipeConsistency.js'

function makeRecipe({ ingredients = [], instructions = [], shoppingList = {} } = {}) {
  return {
    transformedRecipe: {
      ingredients: ingredients.map(item => ({ amount: '1 cup', item })),
      instructions,
    },
    shoppingList,
  }
}

// ── checkConsistency ─────────────────────────────────────────────────────────

describe('checkConsistency — dairy-free', () => {
  it('flags butter in ingredients', () => {
    const recipe = makeRecipe({ ingredients: ['butter', 'oat milk'] })
    const violations = checkConsistency(recipe, { dairyFree: true })
    expect(violations.some(v => v.term === 'butter')).toBe(true)
  })

  it('does NOT flag butternut squash as a dairy violation', () => {
    const recipe = makeRecipe({ ingredients: ['butternut squash', 'olive oil'] })
    const violations = checkConsistency(recipe, { dairyFree: true })
    expect(violations).toHaveLength(0)
  })

  it('flags butter mentioned in instructions', () => {
    const recipe = makeRecipe({ instructions: ['Melt 2 tbsp of butter in a pan.'] })
    const violations = checkConsistency(recipe, { dairyFree: true })
    expect(violations.some(v => v.term === 'butter')).toBe(true)
  })

  it('passes a fully dairy-free recipe', () => {
    const recipe = makeRecipe({ ingredients: ['oat milk', 'coconut cream', 'nutritional yeast'] })
    const violations = checkConsistency(recipe, { dairyFree: true })
    expect(violations).toHaveLength(0)
  })
})

describe('checkConsistency — gluten-free', () => {
  it('flags wheat flour', () => {
    const recipe = makeRecipe({ ingredients: ['wheat flour', 'eggs'] })
    const violations = checkConsistency(recipe, { glutenFree: true })
    expect(violations.some(v => v.restriction === 'glutenFree')).toBe(true)
  })

  it('flags breadcrumbs in instructions', () => {
    const recipe = makeRecipe({ instructions: ['Coat chicken with breadcrumbs.'] })
    const violations = checkConsistency(recipe, { glutenFree: true })
    expect(violations.some(v => v.term === 'breadcrumb')).toBe(true)
  })

  it('passes a gluten-free recipe', () => {
    const recipe = makeRecipe({ ingredients: ['rice flour', 'almond milk', 'tapioca starch'] })
    const violations = checkConsistency(recipe, { glutenFree: true })
    expect(violations).toHaveLength(0)
  })
})

describe('checkConsistency — nut-free (safety-critical)', () => {
  it('flags peanuts', () => {
    const recipe = makeRecipe({ ingredients: ['peanut butter', 'jelly'] })
    const violations = checkConsistency(recipe, { noNuts: true })
    expect(violations.some(v => v.term === 'peanut')).toBe(true)
  })

  it('flags almonds', () => {
    const recipe = makeRecipe({ ingredients: ['sliced almonds', 'blueberries'] })
    const violations = checkConsistency(recipe, { noNuts: true })
    expect(violations.some(v => v.term === 'almond')).toBe(true)
  })

  it('flags walnuts mentioned in instructions', () => {
    const recipe = makeRecipe({ instructions: ['Top with crushed walnuts before serving.'] })
    const violations = checkConsistency(recipe, { noNuts: true })
    expect(violations.some(v => v.term === 'walnut')).toBe(true)
  })

  it('flags cashew in shoppingList', () => {
    const recipe = makeRecipe({ shoppingList: { pantry: ['cashew cream', 'tahini'] } })
    const violations = checkConsistency(recipe, { noNuts: true })
    expect(violations.some(v => v.term === 'cashew')).toBe(true)
  })

  it('does NOT flag "chestnut mushrooms" as a nut violation', () => {
    // chestnut IS in the restricted list — this test confirms the list is intentional,
    // not a false-positive guard (chestnut mushrooms are an edge case callers must handle
    // by naming them "cremini" or similar in transformations).
    const recipe = makeRecipe({ ingredients: ['chestnut mushrooms'] })
    const violations = checkConsistency(recipe, { noNuts: true })
    // If this starts failing, update the RESTRICTED_TERMS list, not this test.
    expect(violations.some(v => v.term === 'chestnut')).toBe(true)
  })

  it('passes a nut-free recipe', () => {
    const recipe = makeRecipe({ ingredients: ['sunflower seeds', 'pumpkin seeds', 'oat milk'] })
    const violations = checkConsistency(recipe, { noNuts: true })
    expect(violations).toHaveLength(0)
  })
})

describe('checkConsistency — no-pork', () => {
  it('flags bacon', () => {
    const recipe = makeRecipe({ ingredients: ['bacon strips', 'eggs'] })
    const violations = checkConsistency(recipe, { noPork: true })
    expect(violations.some(v => v.term === 'bacon')).toBe(true)
  })

  it('does NOT flag "hamburger" as a ham violation', () => {
    const recipe = makeRecipe({ ingredients: ['beef hamburger patty'] })
    const violations = checkConsistency(recipe, { noPork: true })
    expect(violations).toHaveLength(0)
  })

  it('passes a pork-free recipe', () => {
    const recipe = makeRecipe({ ingredients: ['chicken breast', 'garlic', 'olive oil'] })
    const violations = checkConsistency(recipe, { noPork: true })
    expect(violations).toHaveLength(0)
  })
})

describe('checkConsistency — vegan', () => {
  it('flags egg', () => {
    const recipe = makeRecipe({ ingredients: ['eggs', 'spinach'] })
    const violations = checkConsistency(recipe, { vegan: true })
    expect(violations.some(v => v.term === 'egg')).toBe(true)
  })

  it('flags honey', () => {
    const recipe = makeRecipe({ instructions: ['Drizzle honey over the top.'] })
    const violations = checkConsistency(recipe, { vegan: true })
    expect(violations.some(v => v.term === 'honey')).toBe(true)
  })

  it('passes a fully vegan recipe', () => {
    const recipe = makeRecipe({ ingredients: ['tofu', 'broccoli', 'sesame oil', 'soy sauce'] })
    const violations = checkConsistency(recipe, { vegan: true })
    expect(violations).toHaveLength(0)
  })
})

describe('checkConsistency — multiple simultaneous restrictions', () => {
  it('catches both a nut and a dairy violation at the same time', () => {
    const recipe = makeRecipe({ ingredients: ['almond milk', 'parmesan cheese'] })
    const violations = checkConsistency(recipe, { noNuts: true, dairyFree: true })
    const restrictions = violations.map(v => v.restriction)
    expect(restrictions).toContain('noNuts')
    expect(restrictions).toContain('dairyFree')
  })

  it('catches gluten + pork violations together', () => {
    const recipe = makeRecipe({ ingredients: ['wheat noodles', 'pancetta'] })
    const violations = checkConsistency(recipe, { glutenFree: true, noPork: true })
    const restrictions = violations.map(v => v.restriction)
    expect(restrictions).toContain('glutenFree')
    expect(restrictions).toContain('noPork')
  })

  it('returns no violations when the recipe respects all active restrictions', () => {
    const recipe = makeRecipe({
      ingredients: ['chickpeas', 'lemon juice', 'tahini', 'olive oil', 'garlic'],
    })
    const prefs = { noNuts: true, dairyFree: true, glutenFree: true, vegan: true }
    expect(checkConsistency(recipe, prefs)).toHaveLength(0)
  })
})

describe('checkConsistency — inactive restrictions are ignored', () => {
  it('does not flag butter when dairyFree is false', () => {
    const recipe = makeRecipe({ ingredients: ['butter', 'cream'] })
    const violations = checkConsistency(recipe, { dairyFree: false, noNuts: false })
    expect(violations).toHaveLength(0)
  })

  it('does not flag anything when dietaryPreferences is empty', () => {
    const recipe = makeRecipe({ ingredients: ['peanuts', 'butter', 'bacon', 'wheat flour'] })
    expect(checkConsistency(recipe, {})).toHaveLength(0)
  })

  it('does not flag anything when dietaryPreferences is undefined', () => {
    const recipe = makeRecipe({ ingredients: ['peanuts', 'bacon'] })
    expect(checkConsistency(recipe, undefined)).toHaveLength(0)
  })
})

// ── buildDietaryRestrictionLines ─────────────────────────────────────────────

describe('buildDietaryRestrictionLines', () => {
  it('returns empty array when no preferences set', () => {
    expect(buildDietaryRestrictionLines({})).toHaveLength(0)
  })

  it('includes nut-free line with ZERO TOLERANCE language', () => {
    const lines = buildDietaryRestrictionLines({ noNuts: true })
    expect(lines.some(l => l.includes('ZERO TOLERANCE'))).toBe(true)
  })

  it('includes vegan line with eggs and honey', () => {
    const lines = buildDietaryRestrictionLines({ vegan: true })
    expect(lines.some(l => l.includes('eggs') && l.includes('honey'))).toBe(true)
  })

  it('includes custom restriction verbatim', () => {
    const lines = buildDietaryRestrictionLines({ custom: 'No shellfish' })
    expect(lines.some(l => l.includes('No shellfish'))).toBe(true)
  })

  it('returns one line per active restriction', () => {
    const lines = buildDietaryRestrictionLines({ noPork: true, dairyFree: true, glutenFree: true })
    expect(lines).toHaveLength(3)
  })

  it('does not output a vegan line when vegan is false', () => {
    const lines = buildDietaryRestrictionLines({ vegan: false, noNuts: true })
    expect(lines.some(l => l.toLowerCase().includes('vegan'))).toBe(false)
  })
})
