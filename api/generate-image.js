import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

export const config = { maxDuration: 60 }

const ALLOWED_ORIGINS = [
  'https://old2new.app',
  'https://www.old2new.app',
  'http://localhost:5174',
  'http://localhost:5173',
  'http://localhost:4173',
]

function buildFullPrompt(imagePrompt) {
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

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { imagePrompt } = req.body || {}
  if (!imagePrompt) return res.status(400).json({ error: 'imagePrompt is required' })

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) return res.status(500).json({ error: 'Storage not configured' })

  const fullPrompt = buildFullPrompt(imagePrompt)

  try {
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

    return res.json({
      imageUrl: publicUrl,
      imagePrompt: fullPrompt,
      imageModel: 'gpt-image-1',
      imageGeneratedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[Old2New] Image generation error:', err.message)
    return res.status(500).json({ error: 'Image generation failed. Recipe saved without image.' })
  }
}
