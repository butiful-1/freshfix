// ─────────────────────────────────────────────────────────────────────────
// BLOG POSTS — loaded from markdown files in src/blog/posts/*.md at build
// time via Vite's import.meta.glob (eager + raw), so both the client bundle
// and the SSR prerender pass (scripts/prerender.mjs / entry-server.jsx) see
// the same static array with no runtime fetch.
//
// To add a new post: drop a new .md file in src/blog/posts/ with the same
// frontmatter fields (title, subtitle, date, heroImage, heroImageAlt,
// metaDescription) — the index page, article template, and prerender routes
// all pick it up automatically.
// ─────────────────────────────────────────────────────────────────────────
const rawPosts = import.meta.glob('./posts/*.md', { eager: true, query: '?raw', import: 'default' })

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { data: {}, content: raw.trim() }
  const [, frontmatter, content] = match
  const data = {}
  frontmatter.split(/\r?\n/).forEach(line => {
    const idx = line.indexOf(':')
    if (idx === -1) return
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    data[key] = value
  })
  return { data, content: content.trim() }
}

export const BLOG_POSTS = Object.entries(rawPosts)
  .map(([path, raw]) => {
    const slug = path.split('/').pop().replace(/\.md$/, '')
    const { data, content } = parseFrontmatter(raw)
    return { slug, ...data, content }
  })
  .sort((a, b) => new Date(b.date) - new Date(a.date))

export function getBlogPostBySlug(slug) {
  return BLOG_POSTS.find(p => p.slug === slug) || null
}
