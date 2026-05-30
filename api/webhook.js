import Stripe from 'stripe'

export const config = {maxDuration: 10}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event
  try {
    if (webhookSecret) {
      const rawBody = await getRawBody(req)
      const sig = req.headers['stripe-signature']
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    } else {
      // No secret set — accept without verification (dev only)
      event = req.body
    }
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return res.status(400).json({error: `Webhook Error: ${err.message}`})
  }

  console.log('Stripe event:', event?.type)

  switch (event?.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      console.log(`Subscription started — plan: ${session.metadata?.plan}, customer: ${session.customer}`)
      break
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object
      console.log(`Subscription updated — id: ${sub.id}, status: ${sub.status}`)
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object
      console.log(`Subscription cancelled — id: ${sub.id}`)
      break
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object
      console.log(`Payment failed — customer: ${inv.customer}`)
      break
    }
    default:
      console.log(`Unhandled event type: ${event?.type}`)
  }

  return res.json({received: true})
}
