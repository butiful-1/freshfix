// Build-time only. Loaded by scripts/prerender.mjs via Vite's SSR module
// loader (vite.ssrLoadModule) — NOT part of the client bundle, and never
// shipped to the browser. Renders the public, no-auth pages to static
// markup with react-dom/server so crawlers (and first paint) get real HTML
// instead of an empty #root that only fills in after the JS bundle runs.
import { renderToStaticMarkup } from 'react-dom/server'
import SplashScreen from './components/SplashScreen.jsx'
import PublicRecipesIndex from './components/PublicRecipesIndex.jsx'
import PublicRecipePage from './components/PublicRecipePage.jsx'
import { getPublicRecipeBySlug, PUBLIC_RECIPES } from './data/publicRecipes.js'
import {
  websiteJsonLd, itemListJsonLd, recipeJsonLd, breadcrumbJsonLd,
  recipePageMeta, RECIPES_INDEX_META, SITE_URL,
} from './seo/seoHelpers.js'

const noop = () => {}

// Every public route this prerender pass covers.
export const ROUTES = ['/', '/recipes', ...PUBLIC_RECIPES.map(r => `/recipes/${r.slug}`)]

export function renderRoute(url) {
  if (url === '/') {
    return {
      html: renderToStaticMarkup(<SplashScreen onSignUp={noop} onLogin={noop} isTWA={false} />),
      head: {
        title: 'Old2New — Transform Your Recipes',
        description: 'Transform your old comfort recipes into healthy new favorites. Recipe transformation for GLP-1, keto, mediterranean and all healthy diets.',
        canonical: `${SITE_URL}/`,
        image: `${SITE_URL}/og-image.png`,
        jsonLd: [websiteJsonLd()],
      },
    }
  }

  if (url === '/recipes') {
    return {
      html: renderToStaticMarkup(<PublicRecipesIndex onSignUp={noop} onLogin={noop} />),
      head: {
        title: RECIPES_INDEX_META.title,
        description: RECIPES_INDEX_META.description,
        canonical: RECIPES_INDEX_META.canonical,
        image: RECIPES_INDEX_META.image,
        jsonLd: [itemListJsonLd(PUBLIC_RECIPES)],
      },
    }
  }

  const match = url.match(/^\/recipes\/([^/]+)\/?$/)
  if (match) {
    const recipe = getPublicRecipeBySlug(match[1])
    if (!recipe) return null
    const meta = recipePageMeta(recipe)
    return {
      html: renderToStaticMarkup(<PublicRecipePage slug={recipe.slug} onSignUp={noop} onLogin={noop} />),
      head: {
        title: meta.title,
        description: meta.description,
        canonical: meta.canonical,
        image: meta.image,
        jsonLd: [
          recipeJsonLd(recipe),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Recipes', url: '/recipes' },
            { name: recipe.title, url: `/recipes/${recipe.slug}` },
          ]),
        ],
      },
    }
  }

  return null
}
