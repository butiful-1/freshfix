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

// Regression: the checker used to stop at the first matching term per
// category, which starved the repair prompt and produced 422s on repairable
// recipes (mainnet reproduction 2026-09-08 with this exact lasagna).
describe('checkConsistency — reports EVERY violating term within one category', () => {
  const lasagna = {
    transformedRecipe: {
      name: 'Classic Beef Lasagna',
      ingredients: [
        { amount: '1 lb', item: 'ground beef' },
        { amount: '16 oz', item: 'ricotta cheese' },
        { amount: '2 cups', item: 'shredded mozzarella' },
        { amount: '1', item: 'egg' },
        { amount: '1/2 cup', item: 'parmesan' },
      ],
      instructions: ['Brown the beef.', 'Layer noodles with sauces and cheeses.', 'Bake at 375F for 45 minutes.'],
    },
    shoppingList: { produce: [], protein: ['ground beef'], dairy: ['ricotta', 'mozzarella', 'parmesan'], pantry: ['lasagna noodles'], other: ['egg'] },
  }

  it('lists all dairy terms for a dairy-free check, not just the first', async () => {
    const { checkConsistency } = await import('../api/recipeConsistency.js')
    const terms = checkConsistency(lasagna, { dairyFree: true }).map(v => v.term)
    expect(terms).toEqual(expect.arrayContaining(['parmesan', 'mozzarella', 'ricotta']))
    expect(terms).toHaveLength(3)
  })

  it('vegan + dairy-free lasagna reports every animal product and every cheese', async () => {
    const { checkConsistency, describeViolations } = await import('../api/recipeConsistency.js')
    const violations = checkConsistency(lasagna, { vegan: true, dairyFree: true })
    const vegan = violations.filter(v => v.restriction === 'vegan').map(v => v.term)
    const dairy = violations.filter(v => v.restriction === 'dairyFree').map(v => v.term)
    expect(vegan).toEqual(expect.arrayContaining(['beef', 'parmesan', 'mozzarella', 'ricotta', 'egg']))
    expect(dairy).toEqual(expect.arrayContaining(['parmesan', 'mozzarella', 'ricotta']))
    const desc = describeViolations(violations)
    expect(desc).toContain('vegan: found ')
    expect(desc).toContain('dairyFree: found ')
    expect(desc.split('; ')).toHaveLength(2) // one grouped entry per restriction
    for (const t of ['"beef"', '"egg"', '"ricotta"', '"mozzarella"', '"parmesan"']) expect(desc).toContain(t)
  })

  it('does not report the same (restriction, term) pair twice', async () => {
    const { checkConsistency } = await import('../api/recipeConsistency.js')
    const recipe = { transformedRecipe: { ingredients: [{ amount: '1', item: 'egg' }], instructions: ['Beat the egg. Add another egg.'] }, shoppingList: { other: ['egg'] } }
    expect(checkConsistency(recipe, { vegan: true })).toEqual([{ restriction: 'vegan', term: 'egg' }])
  })
})

describe('runRepair — repairs all same-category violations', () => {
  function fakeClient(replyIngredients) {
    return {
      calls: [],
      messages: {
        create: async (req) => {
          fakeClient.last = req
          return { content: [{ text: JSON.stringify({ ingredients: replyIngredients, instructions: ['Layer and bake.'], shoppingList: { produce: [], protein: ['lentils'], dairy: [], pantry: ['noodles'], other: [] } }) }] }
        },
      },
    }
  }
  const prefs = { vegan: true, dairyFree: true }
  const makeResult = () => ({
    transformedRecipe: { ingredients: [{ amount: '1 lb', item: 'ground beef' }, { amount: '16 oz', item: 'ricotta cheese' }, { amount: '2 cups', item: 'mozzarella' }, { amount: '1', item: 'egg' }], instructions: ['Brown the beef.'] },
    shoppingList: { protein: ['ground beef'], dairy: ['ricotta', 'mozzarella'], other: ['egg'] },
  })

  it('tells the repair model every offending term and the full rules', async () => {
    const { checkConsistency, describeViolations, runRepair } = await import('../api/recipeConsistency.js')
    const result = makeResult()
    // Replacement names deliberately avoid restricted keywords ("vegan
    // mozzarella" would still trip the deterministic checker, by design).
    const client = fakeClient([{ amount: '2 cups', item: 'cooked lentils', note: 'swapped for beef' }, { amount: '16 oz', item: 'cashew-based soft cheese', note: 'dairy-free' }, { amount: '2 cups', item: 'plant-based shreds', note: '' }, { amount: '1 tbsp', item: 'ground flaxseed binder', note: '' }])
    await runRepair(client, result, describeViolations(checkConsistency(result, prefs)), prefs)
    const prompt = fakeClient.last.messages[0].content
    for (const t of ['"beef"', '"ricotta"', '"mozzarella"', '"egg"']) expect(prompt).toContain(t)
    expect(prompt).toContain('Vegan: strictly no animal products')
    expect(prompt).toContain('Dairy free')
    expect(checkConsistency(result, prefs)).toHaveLength(0)
  })

  it('still fails closed when the repair leaves a second same-category violation behind', async () => {
    const { checkConsistency, describeViolations, runRepair } = await import('../api/recipeConsistency.js')
    const result = makeResult()
    // Model "fixes" beef and egg but leaves both cheeses.
    const client = fakeClient([{ amount: '2 cups', item: 'cooked lentils' }, { amount: '16 oz', item: 'ricotta cheese' }, { amount: '2 cups', item: 'mozzarella' }, { amount: '1', item: 'flax egg' }])
    await expect(runRepair(client, result, describeViolations(checkConsistency(result, prefs)), prefs)).rejects.toThrow(/Post-repair violations remain: .*"ricotta".*"mozzarella"/)
  })
})

describe('checkConsistency — qualified substitutes are not violations (vegan / dairy-free only)', () => {
  const mk = (items, extra = {}) => ({ transformedRecipe: { ingredients: items.map(item => ({ amount: '1', item })), instructions: extra.instructions || [] }, shoppingList: extra.shoppingList || {} })

  it('"flax egg" is not a vegan egg violation, a plain egg still is', async () => {
    const { checkConsistency } = await import('../api/recipeConsistency.js')
    expect(checkConsistency(mk(['flax egg']), { vegan: true })).toHaveLength(0)
    expect(checkConsistency(mk(['chia egg', 'vegan egg substitute']), { vegan: true })).toHaveLength(0)
    expect(checkConsistency(mk(['flax egg', 'egg']), { vegan: true })).toEqual([{ restriction: 'vegan', term: 'egg' }])
    expect(checkConsistency(mk(['flax egg'], { instructions: ['Beat 1 egg.'] }), { vegan: true })).toEqual([{ restriction: 'vegan', term: 'egg' }])
  })

  it('"vegan mozzarella", "dairy-free ricotta", "plant-based butter" clear the dairy-free and vegan checks', async () => {
    const { checkConsistency } = await import('../api/recipeConsistency.js')
    const recipe = mk(['vegan mozzarella', 'dairy-free ricotta', 'plant-based butter', 'non-dairy parmesan'])
    expect(checkConsistency(recipe, { dairyFree: true, vegan: true })).toHaveLength(0)
    expect(checkConsistency(mk(['mozzarella']), { dairyFree: true })).toEqual([{ restriction: 'dairyFree', term: 'mozzarella' }])
  })

  it('qualifiers never loosen the nut, pork, or gluten checks', async () => {
    const { checkConsistency } = await import('../api/recipeConsistency.js')
    const nutty = checkConsistency(mk(['almond ricotta']), { dairyFree: true, noNuts: true })
    expect(nutty).toEqual([{ restriction: 'noNuts', term: 'almond' }])
    expect(checkConsistency(mk(['vegan bacon']), { noPork: true })).toEqual([{ restriction: 'noPork', term: 'bacon' }])
    expect(checkConsistency(mk(['vegan wheat flour']), { glutenFree: true })).toEqual([{ restriction: 'glutenFree', term: 'wheat' }])
  })

  it('the 2026-09-08 repaired lasagna (cheeses swapped, "flax egg" used) now passes', async () => {
    const { checkConsistency } = await import('../api/recipeConsistency.js')
    const repaired = mk(['2 cups cooked lentils', 'cashew-based soft cheese', 'vegan mozzarella', 'flax egg', 'nutritional yeast'], { instructions: ['Layer noodles with lentils, cashew cheese, and vegan mozzarella. Bake at 375F.'], shoppingList: { dairy: [], other: ['flax egg'] } })
    expect(checkConsistency(repaired, { vegan: true, dairyFree: true })).toHaveLength(0)
  })
})

describe('checkConsistency — absence and descriptor forms', () => {
  const mk = (items, instructions = [], shoppingList = {}) => ({ transformedRecipe: { ingredients: items.map(item => ({ amount: '1', item })), instructions }, shoppingList })

  it('"egg-free lasagna noodles" and "egg substitute" are not vegan violations (seen live 2026-09-08)', async () => {
    const { checkConsistency } = await import('../api/recipeConsistency.js')
    expect(checkConsistency(mk(['egg-free lasagna noodles', 'egg substitute'], [], { pantry: ['12 egg-free lasagna noodles'] }), { vegan: true })).toHaveLength(0)
    expect(checkConsistency(mk(['egg-free lasagna noodles', 'egg']), { vegan: true })).toEqual([{ restriction: 'vegan', term: 'egg' }])
  })

  it('"ricotta-like consistency" in instructions is not a dairy violation (seen live 2026-09-08)', async () => {
    const { checkConsistency } = await import('../api/recipeConsistency.js')
    expect(checkConsistency(mk(['cashew-based soft cheese'], ['Blend until it reaches a ricotta-like consistency.']), { dairyFree: true, vegan: true })).toHaveLength(0)
    expect(checkConsistency(mk(['cashew-based soft cheese'], ['Stir in the ricotta.']), { dairyFree: true })).toEqual([{ restriction: 'dairyFree', term: 'ricotta' }])
  })

  it('absence forms are excused in strict categories too, but plain terms still flag', async () => {
    const { checkConsistency } = await import('../api/recipeConsistency.js')
    expect(checkConsistency(mk(['peanut-free granola', 'wheat-free flour', 'bacon substitute']), { noNuts: true, glutenFree: true, noPork: true })).toHaveLength(0)
    expect(checkConsistency(mk(['peanut-free granola', 'peanuts']), { noNuts: true })).toEqual([{ restriction: 'noNuts', term: 'peanut' }])
    // Descriptor forms stay strict for safety categories: "almond-style" still counts.
    expect(checkConsistency(mk(['almond-style extract']), { noNuts: true })).toEqual([{ restriction: 'noNuts', term: 'almond' }])
  })
})
