// Build-time only. Loaded by scripts/prerender.mjs via Vite's SSR module
// loader (vite.ssrLoadModule) — NOT part of the client bundle, and never
// shipped to the browser. Renders the public, no-auth pages to static
// markup with react-dom/server so crawlers (and first paint) get real HTML
// instead of an empty #root that only fills in after the JS bundle runs.
import { renderToStaticMarkup } from 'react-dom/server'
import SplashScreen from './components/SplashScreen.jsx'
import PublicRecipesIndex from './components/PublicRecipesIndex.jsx'
import PublicRecipePage from './components/PublicRecipePage.jsx'
import BlogIndex from './components/BlogIndex.jsx'
import BlogPostPage from './components/BlogPostPage.jsx'
import AboutPage from './components/AboutPage.jsx'
import ContactPage from './components/ContactPage.jsx'
import { getPublicRecipeBySlug, PUBLIC_RECIPES } from './data/publicRecipes.js'
import { BLOG_POSTS, getBlogPostBySlug } from './blog/loadPosts.js'
import {
  websiteJsonLd, itemListJsonLd, recipeJsonLd, breadcrumbJsonLd,
  recipePageMeta, RECIPES_INDEX_META, SITE_URL,
  blogItemListJsonLd, blogPostJsonLd, blogPostMeta, BLOG_INDEX_META,
  ABOUT_META, aboutPageJsonLd,
  CONTACT_META, contactPageJsonLd,
} from './seo/seoHelpers.js'

const noop = () => {}

// Every public route this prerender pass covers.
export const ROUTES = [
  '/', '/recipes', ...PUBLIC_RECIPES.map(r => `/recipes/${r.slug}`),
  '/blog', ...BLOG_POSTS.map(p => `/blog/${p.slug}`),
  '/about', '/contact',
]

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

  if (url === '/blog') {
    return {
      html: renderToStaticMarkup(<BlogIndex onSignUp={noop} onLogin={noop} />),
      head: {
        title: BLOG_INDEX_META.title,
        description: BLOG_INDEX_META.description,
        canonical: BLOG_INDEX_META.canonical,
        image: BLOG_INDEX_META.image,
        jsonLd: [blogItemListJsonLd(BLOG_POSTS)],
      },
    }
  }

  const blogMatch = url.match(/^\/blog\/([^/]+)\/?$/)
  if (blogMatch) {
    const post = getBlogPostBySlug(blogMatch[1])
    if (!post) return null
    const meta = blogPostMeta(post)
    return {
      html: renderToStaticMarkup(<BlogPostPage slug={post.slug} onSignUp={noop} onLogin={noop} />),
      head: {
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
      },
    }
  }

  if (url === '/about') {
    return {
      html: renderToStaticMarkup(<AboutPage onSignUp={noop} onLogin={noop} />),
      head: {
        title: ABOUT_META.title,
        description: ABOUT_META.description,
        canonical: ABOUT_META.canonical,
        image: ABOUT_META.image,
        jsonLd: [aboutPageJsonLd()],
      },
    }
  }

  if (url === '/contact') {
    return {
      html: renderToStaticMarkup(<ContactPage onSignUp={noop} onLogin={noop} />),
      head: {
        title: CONTACT_META.title,
        description: CONTACT_META.description,
        canonical: CONTACT_META.canonical,
        image: CONTACT_META.image,
        jsonLd: [contactPageJsonLd()],
      },
    }
  }

  return null
}
