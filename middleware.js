const CRAWLER_UA = /facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegram|pinterest\/|googlebot|bingbot|duckduckbot|applebot|embedly|iframely|quora|outbrain|prerender|semrushbot|ahrefsbot|yandexbot/i

const FALLBACK_IMAGE = 'https://old2new.app/og-image.png'
const SITE_URL = 'https://old2new.app'

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function ogHtml({ title, description, imageUrl, recipeUrl }) {
  return `<!doctype html><html lang="en"><head>
<meta charset="UTF-8"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"/>
<meta property="og:site_name" content="Old2New"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:url" content="${esc(recipeUrl)}"/>
<meta property="og:image" content="${esc(imageUrl)}"/>
<meta property="og:image:width" content="1024"/>
<meta property="og:image:height" content="1024"/>
<meta property="fb:app_id" content="880980702336932"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
<meta name="twitter:image" content="${esc(imageUrl)}"/>
</head><body><p>Loading recipe…</p></body></html>`
}

export default async function middleware(request) {
  const url = new URL(request.url)
  const match = url.pathname.match(/^\/recipe\/([0-9a-f-]{36})$/i)
  if (!match) return
  const ua = request.headers.get('user-agent') || ''
  if (!CRAWLER_UA.test(ua)) return

  const recipeId = match[1]
  const recipeUrl = `${SITE_URL}/recipe/${recipeId}`
  let title = 'Healthy Recipe — Old2New'
  let description = 'Transform old comfort recipes into healthy new favorites.'
  let imageUrl = FALLBACK_IMAGE

  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
    if (supabaseUrl && supabaseKey) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/saved_recipes?select=recipe_data&id=eq.${recipeId}`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      )
      if (res.ok) {
        const rows = await res.json()
        if (rows.length > 0) {
          const r = rows[0].recipe_data
          const name = r?.transformedRecipe?.name || r?.originalName
          if (name) title = `${name} — Old2New`
          const diets = Array.isArray(r?.diets) ? r.diets.join(', ') : ''
          const cals = r?.caloriesAfter ? `${r.caloriesAfter} cal` : ''
          const parts = [cals, diets].filter(Boolean)
          if (parts.length) description = `${parts.join(' · ')} · Healthier version on Old2New`
          if (r?.imageUrl && r.imageUrl.startsWith('https://')) imageUrl = r.imageUrl
        }
      }
    }
  } catch {
    // Network error — serve fallback OG tags, don't crash
  }

  return new Response(ogHtml({ title, description, imageUrl, recipeUrl }), {
    headers: { 'content-type': 'text/html;charset=UTF-8', 'cache-control': 'public, max-age=60, s-maxage=300' },
  })
}
