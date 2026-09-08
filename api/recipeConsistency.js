// Deterministic keyword check for allergy/restriction violations.
// Uses word boundaries on both sides (\b...\b) so that e.g. "butter" does not
// match inside "butternut" and "ham" does not match inside "hamburger".
// Remaining known false positive: "peanut butter" in a dairy-free recipe triggers
// the "butter" check — harmless because the Haiku repair call will see the full
// ingredient list, confirm the recipe is dairy-free, and return it unchanged.
const RESTRICTED_TERMS = {
  dairyFree: [
    'whole milk', '2% milk', 'skim milk', 'low-fat milk',
    'heavy cream', 'sour cream', 'cream cheese', 'whipped cream',
    'parmesan', 'cheddar', 'mozzarella', 'ricotta', 'brie', 'feta', 'gruyere',
    'greek yogurt', 'whey', 'casein', 'lactose', 'ghee',
    'butter',
  ],
  glutenFree: [
    'wheat', 'all-purpose flour', 'bread flour', 'cake flour', 'self-rising flour', 'white flour',
    'barley', 'rye', 'breadcrumb', 'semolina', 'spelt', 'couscous',
  ],
  noNuts: [
    'almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'macadamia',
    'peanut', 'pistachio', 'chestnut', 'pine nut', 'brazil nut', 'praline',
  ],
  noPork: [
    'pork', 'bacon', 'ham', 'lard', 'prosciutto', 'pancetta', 'salami', 'pepperoni',
  ],
  vegan: [
    'beef', 'chicken', 'turkey', 'lamb', 'salmon', 'tuna', 'shrimp',
    'crab', 'lobster', 'anchovy', 'anchovies', 'gelatin',
    'whole milk', 'heavy cream', 'butter', 'parmesan', 'cheddar',
    'mozzarella', 'ricotta', 'feta', 'greek yogurt', 'whey',
    'egg', 'honey',
  ],
}

function termMatches(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}s?\\b`, 'i').test(text)
}

function recipeCorpus(recipe) {
  const tr = recipe.transformedRecipe || {}
  const ingredients = (tr.ingredients || [])
    .map(i => `${i.amount ?? ''} ${i.item ?? ''}`)
    .join(' ')
  const instructions = (tr.instructions || []).join(' ')
  const shopping = Object.values(recipe.shoppingList || {}).flat().join(' ')
  return `${ingredients} ${instructions} ${shopping}`
}

// Returns an array of violation objects, one per (restriction, term) pair,
// covering EVERY restricted term present — not just the first per category.
// Empty means consistent.
//
// History: this loop used to `break` after the first matching term in a
// category, so a lasagna with beef + mozzarella + ricotta + parmesan + egg was
// reported as just "vegan: beef, dairyFree: parmesan". The repair model then
// fixed only what it was told about, the post-repair check found the rest, and
// the request failed with 422 even though the recipe was repairable. Reported
// live during paid testing (2026-08) and reproduced on mainnet 2026-09-08.
export function checkConsistency(recipe, dietaryPreferences) {
  const violations = []
  const corpus = recipeCorpus(recipe)
  for (const [key, terms] of Object.entries(RESTRICTED_TERMS)) {
    if (!dietaryPreferences?.[key]) continue
    for (const term of terms) {
      if (termMatches(corpus, term)) violations.push({ restriction: key, term })
    }
  }
  return violations
}

// 'vegan: found "beef", "egg"; dairyFree: found "ricotta"' — grouped per
// restriction so the repair prompt lists every offending term once per category.
export function describeViolations(violations) {
  const byRestriction = new Map()
  for (const v of violations) {
    if (!byRestriction.has(v.restriction)) byRestriction.set(v.restriction, [])
    const terms = byRestriction.get(v.restriction)
    if (!terms.includes(v.term)) terms.push(v.term)
  }
  return [...byRestriction.entries()]
    .map(([restriction, terms]) => `${restriction}: found ${terms.map(t => `"${t}"`).join(', ')}`)
    .join('; ')
}

export function buildDietaryRestrictionLines(dietaryPreferences) {
  const lines = []
  if (dietaryPreferences?.noPork)
    lines.push('- No pork or pork-derived products (bacon, ham, lard, etc.)')
  if (dietaryPreferences?.vegan)
    lines.push('- Vegan: strictly no animal products (no meat, poultry, seafood, dairy, eggs, honey)')
  if (dietaryPreferences?.dairyFree)
    lines.push('- Dairy free: no milk, cheese, butter, cream, yogurt, or any dairy derivatives')
  if (dietaryPreferences?.glutenFree)
    lines.push('- Gluten free: no wheat, barley, rye, or gluten-containing ingredients')
  if (dietaryPreferences?.noNuts)
    lines.push('- No nuts or tree nuts of any kind (treat as life-threatening allergy — ZERO TOLERANCE)')
  if (dietaryPreferences?.custom?.trim())
    lines.push(`- ${dietaryPreferences.custom.trim()}`)
  return lines
}

export function parseJsonResponse(text) {
  let t = text.trim()
  if (t.startsWith('```')) {
    const match = t.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) t = match[1].trim()
  }
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start !== -1 && end !== -1) t = t.slice(start, end + 1)
  return JSON.parse(t)
}

const REPAIR_SYSTEM_PROMPT = `You are Old2New. A recipe was generated but contains ingredients that violate the user's dietary restrictions. Replace any violating ingredients with compliant alternatives, then rewrite the instructions and shoppingList to match.

CRITICAL RULE: Respond ONLY with valid JSON matching this exact structure:
{
  "ingredients": [
    {"amount": "string", "item": "string", "note": "string - swap note or empty string"}
  ],
  "instructions": ["string - step 1", "string - step 2"],
  "shoppingList": {
    "produce": ["string"],
    "protein": ["string"],
    "dairy": ["string"],
    "pantry": ["string"],
    "other": ["string"]
  }
}`

// Mutates result in place.
// Throws if the Haiku API call fails OR if violations remain after repair — callers catch and return 500.
export async function runRepair(client, result, violationDesc, dietaryPreferences) {
  const ingredientList = (result.transformedRecipe?.ingredients || [])
    .map(i => `${i.amount} ${i.item}`.trim()).join(', ')

  // The repair model sees every offending term (violationDesc lists all of
  // them per category) AND the full restriction rules, so it cannot fix one
  // ingredient and leave a sibling violation behind.
  const restrictionLines = buildDietaryRestrictionLines(dietaryPreferences)
  const rulesSection = restrictionLines.length
    ? `\n\nActive dietary restrictions (ALL must hold):\n${restrictionLines.join('\n')}`
    : ''
  const repair = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    system: REPAIR_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Violations: ${violationDesc}${rulesSection}\n\nCurrent ingredients: ${ingredientList}\n\nReplace EVERY violating ingredient (all of the terms listed above, and any other ingredient that breaks the active restrictions) with compliant alternatives. Return the complete updated ingredients list, rewritten instructions, and rewritten shoppingList — all consistent and free of restricted items.`,
    }],
  })
  const repaired = parseJsonResponse(repair.content[0].text)
  if (repaired.ingredients?.length) result.transformedRecipe.ingredients = repaired.ingredients
  if (repaired.instructions) result.transformedRecipe.instructions = repaired.instructions
  if (repaired.shoppingList) result.shoppingList = repaired.shoppingList

  const remaining = checkConsistency(result, dietaryPreferences)
  if (remaining.length > 0) {
    throw new Error(`Post-repair violations remain: ${describeViolations(remaining)}`)
  }
}
