import { Resend } from 'resend'

const ALLOWED_ORIGINS = [
  'https://old2new.app',
  'https://www.old2new.app',
  'http://localhost:5174',
  'http://localhost:5173',
  'http://localhost:4173',
]

function clip(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const name    = clip(req.body?.name, 200)
  const email   = clip(req.body?.email, 200)
  const subject = clip(req.body?.subject, 300)
  const message = clip(req.body?.message, 5000)

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Name, email, subject, and message are all required.' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Email is not configured.' })

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: 'Old2New Contact Form <contact@old2new.app>',
      to: 'admin@old2new.app',
      replyTo: email,
      subject: `[Old2New Contact] ${subject}`,
      text: `New message from the Old2New contact form.\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
    })
    if (error) throw new Error(error.message || 'Resend returned an error')
    return res.json({ ok: true })
  } catch (err) {
    console.error('[contact] send failed:', err.message)
    return res.status(500).json({ error: 'Could not send your message. Please try again.' })
  }
}
