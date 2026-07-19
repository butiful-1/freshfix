import Anthropic from '@anthropic-ai/sdk'
import { checkConsistency, buildDietaryRestrictionLines, parseJsonResponse, runRepair } from './recipeConsistency.js'

export const config = { maxDuration: 55 }

const ALLOWED_ORIGINS = [
  'https://freshfix.app',
  'https://www.freshfix.app',
  'https://freshfix-app.vercel.app',
  'http://localhost:5174',
  'http://localhost:5173',
  'http://localhost:4173',
]

const SYSTEM_PROMPT = `You are Old2New, a warm and encouraging recipe transformation assistant for healthy eating. You help people transform their old comfort recipes into healthy new favorites matching their diet preferences.

CRITICAL RULE: Respond ONLY with valid JSON. No markdown, no code fences, no explanatory text. Your entire response must be a single JSON object starting with { and ending with }.

CRITICAL RULE — RECIPE IDENTITY PRESERVATION:
Old2New's brand promise is "Same comfort. Made new." The user asked for a healthier version of THEIR recipe, not a different recipe from another culture or cuisine.

You MUST preserve BOTH the dish form AND the original cuisine. Diet style names describe NUTRITIONAL PATTERNS, not cuisine changes.

CRITICAL RULE — DIET NAMES ARE NUTRITIONAL PATTERNS, NOT CUISINES:
"Mediterranean" means the Mediterranean Diet — a nutritional pattern emphasizing olive oil, whole grains, legumes, vegetables, lean proteins (fish, poultry), reduced saturated fat, and reduced processed foods. It does NOT mean Greek food, Turkish food, or any other regional cuisine.

Do NOT convert Mexican food into Greek food.
Do NOT convert Italian food into Greek food.
Do NOT import foreign-cuisine ingredients (feta, tzatziki, hummus, pita, lamb, moussaka) into a dish just because the user selected "Mediterranean Diet."

CORRECT — Mediterranean Diet applied to Mexican enchiladas:
- Still enchiladas with Mexican spices, corn tortillas, green chili
- Swap lard or vegetable oil → olive oil
- Swap heavy sour cream → plain low-fat Greek yogurt used sparingly (as a functional dairy swap, not a cuisine import)
- Swap fatty ground beef → lean ground turkey or chicken
- Add more vegetables (black beans, extra peppers, spinach)
- Reduce heavy cheese; use a smaller amount of a sharper cheese for flavor
- Result name: "Mediterranean Diet Green Chili Enchiladas" — still clearly enchiladas

CORRECT — Mediterranean Diet applied to Italian lasagna:
- Still layered pasta lasagna with Italian herbs, marinara, ricotta
- Swap fatty ground beef → lean ground turkey or extra vegetables
- Swap full-fat ricotta → part-skim ricotta
- Swap butter-heavy béchamel → lighter olive oil version
- Use whole wheat lasagna noodles
- Result name: "Mediterranean Diet Lasagna" — still clearly lasagna

WRONG — never do this:
- Mexican Enchiladas → "Stuffed Flatbreads" (changed dish form)
- Italian Lasagna → "Greek Moussaka" (changed both dish and cuisine)
- Chicken Alfredo → "Lemon Chicken Orzo" (changed dish entirely)
- Green Chili Enchiladas + Mediterranean Diet → adding feta and tzatziki (importing Greek cuisine into Mexican food)
- Lasagna + Mediterranean Diet → using lamb and eggplant (importing Greek cuisine into Italian food)

The transformed recipe name must clearly reference the original dish. The dish form and original cuisine must both be preserved.

When given a recipe (or just a dish name), transform it intelligently:
- Preserve the dish form — enchiladas stay enchiladas, lasagna stays lasagna
- Preserve the original cuisine — Mexican food stays Mexican, Italian stays Italian
- Apply the requested diet as a nutritional framework (swap ingredients, adjust methods) without importing a different cuisine's ingredients or traditions
- Make smart ingredient swaps appropriate to the selected diets
- Be encouraging, friendly, and positive
- Always include a reminder to consult a healthcare provider

Your JSON response must match this EXACT structure:
{
  "transformedRecipe": {
    "name": "string - the transformed recipe name",
    "servings": number,
    "prepTime": "string e.g. 15 mins",
    "cookTime": "string e.g. 30 mins",
    "ingredients": [
      { "amount": "string", "item": "string", "note": "optional swap note or empty string" }
    ],
    "instructions": ["string - step 1", "string - step 2"]
  },
  "originalName": "string - the original dish name",
  "ingredientSwaps": [
    { "original": "string", "swapped": "string", "reason": "string - brief reason" }
  ],
  "caloriesBefore": number,
  "caloriesAfter": number,
  "macros": {
    "before": { "protein": number, "carbs": number, "fat": number, "fiber": number },
    "after": { "protein": number, "carbs": number, "fat": number, "fiber": number }
  },
  "whyTheseSwaps": "string - friendly explanation of the transformation approach. Always end with a reminder to consult their doctor or registered dietitian before making dietary changes.",
  "shoppingList": {
    "produce": ["string"],
    "protein": ["string"],
    "dairy": ["string"],
    "pantry": ["string"],
    "other": ["string"]
  },
  "encouragement": "string - 1-2 sentence motivating message about this transformation",
  "imagePrompt": "Describe only the finished plated dish. Include visible ingredients, colors, textures, garnishes, serving vessel, and portion size. Do not describe lighting, camera angles, photography style, or artistic effects."
}`

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { recipe, diets, dietaryPreferences, healthGoal } = req.body || {}

  if (!recipe || !diets || !Array.isArray(diets) || diets.length === 0) {
    return res.status(400).json({ error: 'Recipe and at least one diet preference are required.' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    return res.status(500).json({ error: 'API key not configured. Add ANTHROPIC_API_KEY in Vercel environment variables.' })
  }

  const client = new Anthropic({ apiKey })

  try {
    const restrictionLines = buildDietaryRestrictionLines(dietaryPreferences)
    const restrictionsSection = restrictionLines.length > 0
      ? `\nIMPORTANT dietary restrictions that MUST be strictly followed:\n${restrictionLines.join('\n')}\n`
      : ''

    const trimmedGoal = typeof healthGoal === 'string' ? healthGoal.trim() : ''
    const healthGoalSection = trimmedGoal
      ? `\nAdditional health goal or dietary preference: ${trimmedGoal}`
      : ''

    const userMessage = `Please transform this recipe for the following diet preferences: ${diets.join(', ')}.${restrictionsSection}${healthGoalSection}

Recipe input:
${recipe}

Transform it according to the diet preferences${restrictionLines.length > 0 ? ' AND dietary restrictions' : ''} and return the JSON response.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    let result = parseJsonResponse(message.content[0].text)

    // Deterministic consistency check — zero cost, ~1ms.
    // Falls back to a cheap Haiku repair call only when violations are found.
    const violations = checkConsistency(result, dietaryPreferences)
    if (violations.length > 0) {
      const violationDesc = violations.map(v => `${v.restriction}: found "${v.term}"`).join(', ')
      const isSafetyCritical = violations.some(v => v.restriction === 'noNuts')
      try {
        await runRepair(client, result, violationDesc, dietaryPreferences)
      } catch (repairErr) {
        // Never return a recipe we already know violates a dietary restriction.
        // noNuts is CRITICAL (life-threatening); all others are HIGH.
        console.error(
          `[${isSafetyCritical ? 'CRITICAL' : 'HIGH'}] Repair call failed — dietary violation unresolved. Violations: ${violationDesc}. Error: ${repairErr.message}`
        )
        return res.status(500).json({
          error: 'We detected a dietary restriction issue that could not be safely resolved. Please try again.',
        })
      }
    }

    return res.json(result)
  } catch (err) {
    console.error('Transform error:', err.message)
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'Something went wrong. Please try again.' })
    }
    if (err.status === 401) {
      return res.status(500).json({ error: 'Invalid API key. Check ANTHROPIC_API_KEY in Vercel environment variables.' })
    }
    if (err.error?.type === 'overloaded_error' || err.status === 503) {
      return res.status(503).json({ error: '🌿 Our kitchen is a little busy right now. Please try again in a moment!' })
    }
    return res.status(500).json({ error: 'Something went wrong. Please try again!' })
  }
}
