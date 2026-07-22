// Post-build static prerender pass.
//
// Why this exists: the app is a client-rendered Vite/React SPA (no SSR
// framework, no react-helmet, no existing prerender tooling). For the new
// public /recipes pages (and the homepage) to have real, crawlable HTML —
// not just an empty <div id="root"> that fills in after JS runs — this
// script renders each public route to static markup at build time using
// react-dom/server (already a transitive dep of react-dom, no new package)
// via Vite's own SSR module loader (`vite.ssrLoadModule`, part of the
// existing `vite` devDependency — the same technique Vite's own SSG guide
// documents). It does NOT add a new dependency or a second bundler.
//
// Runs after `vite build` (see package.json "build" script). For each route
// it takes the already-built dist/index.html as a template, swaps in
// per-page <title>/meta/canonical/OG/Twitter tags + JSON-LD, injects the
// prerendered markup into #root, and writes the result as a static file.
// Because these are real files, Vercel serves them directly for an exact
// path match (see vercel.json) — the SPA catch-all rewrite only kicks in
// for routes that don't correspond to a real file, so client-side routing
// for every other in-app screen is unaffected.
//
// The client bundle then boots normally on top of the prerendered HTML
// (main.jsx uses createRoot(...).render(), not hydrateRoot, so it fully
// replaces the prerendered DOM — no hydration-mismatch risk).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const distDir = path.join(root, 'dist')

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function replaceTagContent(html, matchAttr, newContent) {
  const re = new RegExp(`<meta[^>]*${matchAttr}[^>]*>`, 'i')
  if (re.test(html)) {
    return html.replace(re, tag => tag.replace(/content="[^"]*"/, `content="${esc(newContent)}"`))
  }
  return html // tag not present in template — caller inserts a fresh one instead
}

function insertBeforeHeadClose(html, snippet) {
  return html.replace('</head>', `${snippet}\n</head>`)
}

function applyHead(template, head) {
  let html = template

  // <title>
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(head.title)}</title>`)

  // meta description
  html = replaceTagContent(html, 'name="description"', head.description)

  // canonical link (template has none — always insert fresh, template is
  // re-read fresh for every page so there's never a stale one to clash with)
  html = insertBeforeHeadClose(html, `<link rel="canonical" href="${esc(head.canonical)}"/>`)

  // OG tags (all present in template — replace content)
  html = replaceTagContent(html, 'property="og:title"', head.title)
  html = replaceTagContent(html, 'property="og:description"', head.description)
  html = replaceTagContent(html, 'property="og:url"', head.canonical)
  html = replaceTagContent(html, 'property="og:image"', head.image)

  // Twitter tags — card is present, title/description/image are not
  html = insertBeforeHeadClose(html, [
    `<meta name="twitter:title" content="${esc(head.title)}"/>`,
    `<meta name="twitter:description" content="${esc(head.description)}"/>`,
    `<meta name="twitter:image" content="${esc(head.image)}"/>`,
  ].join('\n'))

  // JSON-LD
  const jsonLdBlocks = (head.jsonLd || [])
    .map(obj => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`)
    .join('\n')
  if (jsonLdBlocks) html = insertBeforeHeadClose(html, jsonLdBlocks)

  return html
}

function injectRootMarkup(html, markup) {
  return html.replace('<div id="root"></div>', `<div id="root">${markup}</div>`)
}

async function run() {
  const templatePath = path.join(distDir, 'index.html')
  if (!fs.existsSync(templatePath)) {
    console.error('[prerender] dist/index.html not found — run `vite build` first.')
    process.exit(1)
  }
  const template = fs.readFileSync(templatePath, 'utf-8')

  const vite = await createServer({
    root,
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'warn',
  })

  let renderRoute, ROUTES
  try {
    const mod = await vite.ssrLoadModule('/src/entry-server.jsx')
    renderRoute = mod.renderRoute
    ROUTES = mod.ROUTES
  } finally {
    // Keep server open until after rendering — close in finally below.
  }

  let written = 0
  for (const url of ROUTES) {
    const result = renderRoute(url)
    if (!result) {
      console.warn(`[prerender] no route match, skipping: ${url}`)
      continue
    }
    const page = applyHead(template, result.head)
    const finalHtml = injectRootMarkup(page, result.html)

    const outPath = url === '/'
      ? path.join(distDir, 'index.html')
      : path.join(distDir, url.replace(/^\//, ''), 'index.html')

    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, finalHtml, 'utf-8')
    written++
    console.log(`[prerender] wrote ${path.relative(distDir, outPath)}  (${url})`)
  }

  await vite.close()
  console.log(`[prerender] done — ${written}/${ROUTES.length} routes prerendered.`)
}

run().catch(err => {
  console.error('[prerender] failed:', err)
  process.exit(1)
})
