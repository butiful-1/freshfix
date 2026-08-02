import ReactMarkdown from 'react-markdown'
import useDocumentHead from '../seo/useDocumentHead.js'
import { blogPostJsonLd, blogPostMeta, breadcrumbJsonLd } from '../seo/seoHelpers.js'
import { getBlogPostBySlug } from '../blog/loadPosts.js'
import { PublicHeader, PublicFooter } from './shared/PublicPageChrome.jsx'
import BlogCTA from './BlogCTA.jsx'

const T   = '#111827'
const TM  = '#6B7280'
const GD  = '#16A34A'
const SF  = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const SRF = 'Georgia, "Times New Roman", serif'

function formatDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// One reusable template, driven entirely by a markdown file in
// src/blog/posts/ (see src/blog/loadPosts.js). To add a new article, add a
// new .md file — this component and its route both pick it up automatically
// (see src/App.jsx path.startsWith('/blog/') handling).
export default function BlogPostPage({ slug, onSignUp, onLogin }) {
  const post = getBlogPostBySlug(slug)

  const meta = post ? blogPostMeta(post) : null
  useDocumentHead(post ? {
    title: meta.title,
    description: meta.description,
    canonical: meta.canonical,
    image: meta.image,
    jsonLd: [
      blogPostJsonLd(post),
      breadcrumbJsonLd([
        { name: 'Home', url: '/' },
        { name: 'Blog', url: '/blog' },
        { name: post.title, url: `/blog/${post.slug}` },
      ]),
    ],
  } : {})

  if (!post) {
    return (
      <div style={{ background: 'white', minHeight: '100vh', fontFamily: SF }}>
        <PublicHeader onSignUp={onSignUp} onLogin={onLogin} />
        <div style={{ padding: '96px 40px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: SRF, fontSize: 32, color: T, marginBottom: 16 }}>Article not found</h1>
          <p style={{ color: TM, marginBottom: 24 }}>This blog post doesn't exist (yet).</p>
          <a href="/blog" style={{ color: GD, fontWeight: 600 }}>← Browse all articles</a>
        </div>
        <PublicFooter />
      </div>
    )
  }

  return (
    <div style={{ background: 'white', minHeight: '100vh', fontFamily: SF, overflowX: 'hidden' }}>
      <PublicHeader onSignUp={onSignUp} onLogin={onLogin} />

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '0 0 40px' }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ padding: '20px 20px 0' }}>
          <ol style={{ display: 'flex', flexWrap: 'wrap', gap: 6, listStyle: 'none', fontSize: 13, color: TM, fontFamily: SF }}>
            <li><a href="/" style={{ color: TM, textDecoration: 'none' }}>Home</a></li>
            <li aria-hidden="true">/</li>
            <li><a href="/blog" style={{ color: TM, textDecoration: 'none' }}>Blog</a></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" style={{ color: T, fontWeight: 600 }}>{post.title}</li>
          </ol>
        </nav>

        {/* Title + date */}
        <header style={{ padding: '20px 20px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#7D8E7F', marginBottom: 10, fontFamily: SF }}>
            {formatDate(post.date)}
          </div>
          <h1 style={{
            fontFamily: SRF, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700,
            color: T, letterSpacing: -1, lineHeight: 1.1, marginBottom: 12,
          }}>
            {post.title}
          </h1>
          {post.subtitle && (
            <p style={{ fontSize: 18, color: TM, lineHeight: 1.5, fontFamily: SF, marginBottom: 4 }}>
              {post.subtitle}
            </p>
          )}
        </header>

        {/* Hero image */}
        {post.heroImage && (
          <div style={{ margin: '20px 0', padding: '0 20px' }}>
            <img
              src={post.heroImage}
              alt={post.heroImageAlt || post.title}
              style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 12, display: 'block' }}
            />
          </div>
        )}

        {/* Article body */}
        <div className="blog-content" style={{ padding: '8px 20px 0' }}>
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        {/* CTA — one shared component, rendered here so every article gets
            it automatically without repeating markup in each .md file. */}
        <div style={{ padding: '8px 20px 0' }}>
          <BlogCTA />
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
