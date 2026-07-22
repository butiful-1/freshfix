import { useEffect } from 'react'

// Minimal hand-rolled substitute for react-helmet-async (no new dependency —
// the app doesn't ship one, and every existing "screen" shares a single
// static index.html, so there's no prior pattern for per-route head tags).
// Imperatively sets <title>, meta description, canonical, OG/Twitter tags,
// and one or more JSON-LD <script> blocks; restores the original homepage
// tags on unmount so navigating back to the app doesn't leave stale SEO
// metadata behind.
//
// `jsonLd` may be a single object or an array of objects (each rendered as
// its own <script type="application/ld+json"> tag).
export default function useDocumentHead({ title, description, canonical, image, jsonLd }) {
  useEffect(() => {
    const prevTitle = document.title
    const prevDescription = getMeta('name', 'description')
    const prevCanonical = getLink('canonical')
    const prevOgTitle = getMeta('property', 'og:title')
    const prevOgDescription = getMeta('property', 'og:description')
    const prevOgUrl = getMeta('property', 'og:url')
    const prevOgImage = getMeta('property', 'og:image')
    const prevTwitterTitle = getMeta('name', 'twitter:title')
    const prevTwitterDescription = getMeta('name', 'twitter:description')
    const prevTwitterImage = getMeta('name', 'twitter:image')

    if (title) document.title = title
    if (description) setMeta('name', 'description', description)
    if (canonical) setLink('canonical', canonical)
    if (title) setMeta('property', 'og:title', title)
    if (description) setMeta('property', 'og:description', description)
    if (canonical) setMeta('property', 'og:url', canonical)
    if (image) setMeta('property', 'og:image', image)
    if (title) setMeta('name', 'twitter:title', title)
    if (description) setMeta('name', 'twitter:description', description)
    if (image) setMeta('name', 'twitter:image', image)

    const scripts = injectJsonLd(jsonLd)

    return () => {
      document.title = prevTitle
      if (prevDescription != null) setMeta('name', 'description', prevDescription)
      if (prevCanonical != null) setLink('canonical', prevCanonical)
      else removeLink('canonical')
      if (prevOgTitle != null) setMeta('property', 'og:title', prevOgTitle)
      if (prevOgDescription != null) setMeta('property', 'og:description', prevOgDescription)
      if (prevOgUrl != null) setMeta('property', 'og:url', prevOgUrl)
      if (prevOgImage != null) setMeta('property', 'og:image', prevOgImage)
      if (prevTwitterTitle != null) setMeta('name', 'twitter:title', prevTwitterTitle)
      if (prevTwitterDescription != null) setMeta('name', 'twitter:description', prevTwitterDescription)
      if (prevTwitterImage != null) setMeta('name', 'twitter:image', prevTwitterImage)
      scripts.forEach(s => s.remove())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, canonical, image, jsonLd])
}

function getMeta(attr, key) {
  const el = document.head.querySelector(`meta[${attr}="${key}"]`)
  return el ? el.getAttribute('content') : null
}

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function getLink(rel) {
  const el = document.head.querySelector(`link[rel="${rel}"]`)
  return el ? el.getAttribute('href') : null
}

function setLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function removeLink(rel) {
  const el = document.head.querySelector(`link[rel="${rel}"]`)
  if (el) el.remove()
}

function injectJsonLd(jsonLd) {
  if (!jsonLd) return []
  const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd]
  return items.map(obj => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute('data-old2new-seo', '1')
    script.text = JSON.stringify(obj)
    document.head.appendChild(script)
    return script
  })
}
