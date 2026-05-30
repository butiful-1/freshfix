import Stripe from 'stripe'

export const config = {maxDuration: 10}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({error: 'Method not allowed'})

  const sessionId = req.query?.sessionId
  if (!sessionId) return res.status(400).json({error: 'sessionId query parameter required'})

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    return res.json({
      plan: session.metadata?.plan || 'wellness',
      status: session.payment_status,
      email: session.customer_details?.email || null,
    })
  } catch (err) {
    console.error('verify-session error:', err.message)
    return res.status(500).json({error: err.message})
  }
}
