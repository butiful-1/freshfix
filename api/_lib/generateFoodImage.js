// Shared OpenAI food-photo generation + Supabase storage, extracted from
// api/generate-image.js so the agent-facing paid endpoint reuses the exact
// same image pipeline instead of a second implementation. Behavior is
// unchanged from the original inline version.
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

export function buildFullPrompt(imagePrompt) {
  return [
    'Professional food photography of a healthy homemade dish.',
    '',
    imagePrompt,
    '',
    'Michelin-star presentation.',
    'Natural window light.',
    'Overhead composition.',
    'White ceramic plate.',
    'Fresh, vibrant ingredients.',
    'Restaurant-quality realism.',
  ].join('\n')
}

// Throws on any failure — callers decide how to respond (and, for paid
// endpoints, must not settle payment if this throws).
export async function generateFoodImage(imagePrompt) {
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) throw new Error('OPENAI_API_KEY not configured')

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) throw new Error('Storage not configured')

  const fullPrompt = buildFullPrompt(imagePrompt)
  const openai = new OpenAI({ apiKey: openaiKey })

  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt: fullPrompt,
    n: 1,
    size: '1024x1024',
    quality: 'medium',
  })

  const b64 = response.data[0]?.b64_json
  if (!b64) throw new Error('No image data returned from OpenAI')

  const buffer = Buffer.from(b64, 'base64')
  const fileName = `${randomUUID()}.png`

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { error: uploadError } = await supabase.storage
    .from('recipe-images')
    .upload(fileName, buffer, { contentType: 'image/png', upsert: false })
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from('recipe-images')
    .getPublicUrl(fileName)

  return {
    imageUrl: publicUrl,
    imagePrompt: fullPrompt,
    imageModel: 'gpt-image-1',
    imageGeneratedAt: new Date().toISOString(),
    usage: response.usage || null,
  }
}
