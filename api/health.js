export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.json({ status: 'ok', model: 'claude-sonnet-4-6' })
}
