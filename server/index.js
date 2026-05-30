import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import 'dotenv/config'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: ['http://localhost:5174', 'http://localhost:5173', 'http://localhost:4173'] }))
app.use(express.json({ limit: '16kb' }))

const SYSTEM_PROMPT = `You are FreshFix, a warm and encouraging recipe transformation assistant for healthy eating. You help people fix their favorite recipes into healthier, fresher versions matching their diet preferences.

CRITICAL RULE: Respond ONLY with valid JSON. No markdown, no code fences, no explanatory text. Your entire response must be a single JSON object starting with { and ending with }.

When given a recipe (or just a dish name), transform it intelligently:
- Keep the spirit and comfort of the original dish
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
  "encouragement": "string - 1-2 sentence motivating message about this transformation"
}`

app.post('/api/transform', async (req, res) => {
  const { recipe, diets } = req.body

  if (!recipe || !diets || !Array.isArray(diets) || diets.length === 0) {
    return res.status(400).json({ error: 'Recipe and at least one diet preference are required.' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    return res.status(500).json({
      error: 'API key not configured. Please add your ANTHROPIC_API_KEY to the .env file and restart the server.'
    })
  }

  const client = new Anthropic({ apiKey })

  try {
    const userMessage = `Please transform this recipe for the following diet preferences: ${diets.join(', ')}.

Recipe input:
${recipe}

Transform it according to the diet preferences and return the JSON response.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    })

    let responseText = message.content[0].text.trim()

    // Strip markdown code fences if present
    if (responseText.startsWith('```')) {
      const match = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (match) responseText = match[1].trim()
    }

    // Find JSON boundaries
    const start = responseText.indexOf('{')
    const end = responseText.lastIndexOf('}')
    if (start !== -1 && end !== -1) {
      responseText = responseText.slice(start, end + 1)
    }

    const result = JSON.parse(responseText)
    res.json(result)
  } catch (err) {
    console.error('Transform error:', err.message)
    if (err instanceof SyntaxError) {
      res.status(500).json({ error: 'The AI returned an unexpected format. Please try again.' })
    } else if (err.status === 401) {
      res.status(500).json({ error: 'Invalid API key. Please check your ANTHROPIC_API_KEY in .env.' })
    } else {
      res.status(500).json({ error: err.message || 'Failed to transform recipe. Please try again.' })
    }
  }
})

app.get('/api/health', (_req, res) => res.json({ status: 'ok', model: 'claude-sonnet-4-6' }))

app.listen(PORT, () => {
  console.log(`\n🌿 FreshFix API server running on http://localhost:${PORT}`)
  console.log(`   API key configured: ${process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_api_key_here' ? '✅ Yes' : '❌ No — add to .env file'}\n`)
})
