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
