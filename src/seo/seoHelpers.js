// ─────────────────────────────────────────────────────────────────────────
// SEO / JSON-LD helpers — pure functions, no React/DOM dependency.
// Shared by the client (via useDocumentHead) and the build-time prerender
// script (scripts/prerender.mjs / src/entry-server.jsx) so both paths emit
// identical structured data.
// ─────────────────────────────────────────────────────────────────────────
import { SITE_URL, isPlaceholder } from '../data/publicRecipes.js'

export { SITE_URL }

export function absUrl(pathname) {
  if (!pathname) return SITE_URL
  return pathname.startsWith('http') ? pathname : `${SITE_URL}${pathname}`
}

// "20 mins" / "1 hr 15 mins" / "30 mins" → ISO 8601 duration ("PT20M", "PT1H15M")
// Returns null for anything it can't confidently parse (e.g. placeholders),
// so callers can omit the field from JSON-LD rather than emit a bad value.
export function toIsoDuration(text) {
  if (!text || typeof text !== 'string') return null
  const hrMatch = text.match(/(\d+(?:\.\d+)?)\s*h(?:r|our)?/i)
  const minMatch = text.match(/(\d+(?:\.\d+)?)\s*m(?:in)?/i)
  if (!hrMatch && !minMatch) return null
  let out = 'PT'
  if (hrMatch) out += `${hrMatch[1]}H`
  if (minMatch) out += `${minMatch[1]}M`
  return out
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'Old2New',
        description: 'Transform your old comfort recipes into healthy new favorites.',
      },
      {
        '@type': 'WebApplication',
        '@id': `${SITE_URL}/#webapplication`,
        name: 'Old2New',
        url: SITE_URL,
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web, Android',
        description:
          'Old2New transforms your favorite recipes into healthier versions matched to diets like GLP-1 Friendly, Keto, Mediterranean, High Protein, Low Sugar, Low Calorie, and Diabetic Friendly.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
    ],
  }
}

export function itemListJsonLd(recipes) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Recipe Transformations',
    itemListElement: recipes.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absUrl(`/recipes/${r.slug}`),
      name: r.title,
    })),
  }
}

export function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absUrl(item.url),
    })),
  }
}

// Only includes fields actually shown on the page — no fabricated ratings,
// reviews, authorship, cost, or dates beyond datePublished/dateModified
// (which the record always carries). Placeholder ingredients/instructions/
// macros (see src/data/publicRecipes.js) are intentionally omitted rather
// than emitted as fake structured data.
export function recipeJsonLd(recipe) {
  const hasIngredients = Array.isArray(recipe.ingredients) &&
    recipe.ingredients.length > 0 && !isPlaceholder(recipe.ingredients[0]?.item)
  const hasInstructions = Array.isArray(recipe.instructions) &&
    recipe.instructions.length > 0 && !isPlaceholder(recipe.instructions[0])
  const hasCalories = typeof recipe.caloriesAfter === 'number'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    image: absUrl(recipe.heroImage),
    url: recipe.canonicalUrl || absUrl(`/recipes/${recipe.slug}`),
    datePublished: recipe.datePublished,
    dateModified: recipe.dateModified,
  }

  if (!isPlaceholder(recipe.summary)) jsonLd.description = recipe.summary
  if (recipe.servings) jsonLd.recipeYield = `${recipe.servings} servings`
  const prepIso = toIsoDuration(recipe.prepTime)
  const cookIso = toIsoDuration(recipe.cookTime)
  if (prepIso) jsonLd.prepTime = prepIso
  if (cookIso) jsonLd.cookTime = cookIso
  if (hasIngredients) jsonLd.recipeIngredient = recipe.ingredients.map(i => `${i.amount ? i.amount + ' ' : ''}${i.item}`.trim())
  if (hasInstructions) {
    jsonLd.recipeInstructions = recipe.instructions.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text: step,
    }))
  }
  if (hasCalories) {
    jsonLd.nutrition = {
      '@type': 'NutritionInformation',
      calories: `${recipe.caloriesAfter} calories`,
    }
  }
  const goals = recipe.healthGoals || (recipe.healthGoal ? [recipe.healthGoal] : [])
  if (goals.length) jsonLd.keywords = goals.join(', ')
  if (goals.length) jsonLd.recipeCategory = goals[0]

  return jsonLd
}

export function recipePageMeta(recipe) {
  return {
    title: recipe.seoTitle || `${recipe.title} | Old2New`,
    description: recipe.metaDescription,
    canonical: recipe.canonicalUrl || absUrl(`/recipes/${recipe.slug}`),
    image: absUrl(recipe.heroImage),
  }
}

export const RECIPES_INDEX_META = {
  title: 'Recipe Transformations | Old2New',
  description:
    'See how Old2New gives familiar favorites a fresh new direction while keeping the comfort you love. Browse real recipe transformations.',
  canonical: absUrl('/recipes'),
  image: absUrl('/og-image.png'),
}

export function blogItemListJsonLd(posts) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Old2New Blog',
    itemListElement: posts.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absUrl(`/blog/${p.slug}`),
      name: p.title,
    })),
  }
}

export function blogPostJsonLd(post) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.metaDescription,
    image: absUrl(post.heroImage),
    author: { '@type': 'Organization', name: 'Old2New' },
    publisher: {
      '@type': 'Organization',
      name: 'Old2New',
      logo: { '@type': 'ImageObject', url: absUrl('/icon-512.png') },
    },
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: { '@type': 'WebPage', '@id': absUrl(`/blog/${post.slug}`) },
  }
}

export function blogPostMeta(post) {
  return {
    title: `${post.title} | Old2New`,
    description: post.metaDescription,
    canonical: absUrl(`/blog/${post.slug}`),
    image: absUrl(post.heroImage),
  }
}

export const BLOG_INDEX_META = {
  title: 'Blog | Old2New',
  description: 'Recipe transformation tips, ingredient swaps, and healthy comfort food ideas from Old2New.',
  canonical: absUrl('/blog'),
  image: absUrl('/og-image.png'),
}

export const ABOUT_META = {
  title: 'Our Story | Old2New',
  description: 'Old2New began with a stage 4 liver failure diagnosis and nine years of transforming favorite recipes. This is why we believe food should never come with shame — and why comfort food is always the hero.',
  canonical: absUrl('/about'),
  image: absUrl('/og-image.png'),
}

export function aboutPageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'Our Story',
    description: ABOUT_META.description,
    url: ABOUT_META.canonical,
    mainEntity: { '@type': 'Organization', name: 'Old2New', url: SITE_URL },
  }
}

export const CONTACT_META = {
  title: 'Contact Old2New | Old2New',
  description: 'Have a question, need help with your account, or want to share feedback? Contact Old2New at admin@old2new.app.',
  canonical: absUrl('/contact'),
  image: absUrl('/og-image.png'),
}

export function contactPageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Old2New',
    description: CONTACT_META.description,
    url: CONTACT_META.canonical,
    mainEntity: {
      '@type': 'Organization',
      name: 'Old2New',
      url: SITE_URL,
      contactPoint: { '@type': 'ContactPoint', email: 'admin@old2new.app', contactType: 'customer support' },
    },
  }
}
