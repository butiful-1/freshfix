import useDocumentHead from '../seo/useDocumentHead.js'
import { blogItemListJsonLd, BLOG_INDEX_META } from '../seo/seoHelpers.js'
import { BLOG_POSTS } from '../blog/loadPosts.js'
import { PublicHeader, PublicFooter } from './shared/PublicPageChrome.jsx'

const T   = '#111827'
const TM  = '#6B7280'
const SF  = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const SRF = 'Georgia, "Times New Roman", serif'

function formatDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// Data-driven index page — one template, fed entirely by BLOG_POSTS (which
// is itself derived from the markdown files in src/blog/posts/). Adding a
// new post means adding a new .md file; this component needs no changes.
export default function BlogIndex({ onSignUp, onLogin }) {
  useDocumentHead({
    title: BLOG_INDEX_META.title,
    description: BLOG_INDEX_META.description,
    canonical: BLOG_INDEX_META.canonical,
    image: BLOG_INDEX_META.image,
    jsonLd: blogItemListJsonLd(BLOG_POSTS),
  })

  return (
    <div style={{ background: 'white', minHeight: '100vh', fontFamily: SF, overflowX: 'hidden' }}>
      <PublicHeader onSignUp={onSignUp} onLogin={onLogin} />

      <main>
        <section style={{ padding: '72px 40px 24px', textAlign: 'center' }}>
          <h1 style={{
            fontFamily: SRF, fontSize: 'clamp(32px, 4.5vw, 56px)', fontWeight: 700,
            color: T, letterSpacing: -1.5, lineHeight: 1.05, marginBottom: 20,
          }}>
            The Old2New Blog
          </h1>
          <p style={{ fontSize: 17, color: TM, lineHeight: 1.7, maxWidth: 620, margin: '0 auto', fontFamily: SF }}>
            Ideas, swaps, and stories behind making the food you love work better for you.
          </p>
        </section>

        <section style={{ padding: '48px 40px 108px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {BLOG_POSTS.map(post => (
              <a
                key={post.slug}
                href={`/blog/${post.slug}`}
                style={{
                  display: 'block', textDecoration: 'none', color: 'inherit',
                  padding: '28px 4px', borderBottom: '1px solid #EDE8E1',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#7D8E7F', marginBottom: 8, fontFamily: SF }}>
                  {formatDate(post.date)}
                </div>
                <h2 style={{ fontFamily: SRF, fontSize: 26, fontWeight: 700, color: T, letterSpacing: -0.5, marginBottom: 8, lineHeight: 1.25 }}>
                  {post.title}
                </h2>
                <p style={{ fontSize: 16, color: TM, lineHeight: 1.6, fontFamily: SF }}>
                  {post.subtitle}
                </p>
              </a>
            ))}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
