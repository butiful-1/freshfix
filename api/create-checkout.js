import Stripe from 'stripe'

export const config = {maxDuration: 10}

const ALLOWED_ORIGINS = [
  'https://freshfix.app',
  'https://www.freshfix.app',
  'https://freshfix-app.vercel.app',
  'http://localhost:5174',
  'http://localhost:5173',
]

const PLAN_PRICES = {
  wellness: process.env.STRIPE_WELLNESS_PRICE_ID,
  family:   process.env.STRIPE_FAMILY_PRICE_ID,
}

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'})

  const {plan} = req.body || {}
  if (!['wellness', 'family'].includes(plan)) {
    return res.status(400).json({error: 'Invalid plan. Must be wellness or family.'})
  }

  const priceId = PLAN_PRICES[plan]
  if (!priceId) {
    return res.status(500).json({error: `Price ID for plan "${plan}" not configured in environment variables.`})
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const baseUrl = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://freshfix.app'

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{price: priceId, quantity: 1}],
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel`,
      metadata: {plan},
    })
    return res.json({url: session.url})
  } catch (err) {
    console.error('Stripe checkout error:', err.message)
    return res.status(500).json({error: err.message})
  }
}
