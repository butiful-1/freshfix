import useDocumentHead from '../seo/useDocumentHead.js'
import { ABOUT_META, aboutPageJsonLd } from '../seo/seoHelpers.js'
import { PublicHeader, PublicFooter } from './shared/PublicPageChrome.jsx'
import Old2NewCTA from './Old2NewCTA.jsx'

const T   = '#111827'
const TM  = '#6B7280'
const SF  = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const SRF = 'Georgia, "Times New Roman", serif'

const CONTINUE_LINKS = [
  { href: '/blog', label: 'The Knowledge Library' },
  { href: '/blog/what-is-recipe-transformation', label: 'What Is Recipe Transformation?' },
  { href: '/blog/what-can-i-make-with-chicken', label: 'What Can I Make with Chicken?' },
  { href: '/blog/healthy-ingredient-swaps', label: 'Healthy Ingredient Swaps That Actually Taste Good' },
  { href: '/blog/how-to-make-comfort-food-healthier', label: 'How to Make Comfort Food Healthier' },
]

// Static public page — no slug, no not-found branch, this route always
// resolves. Structurally the same as BlogPostPage.jsx (hero, narrative body
// via .blog-content, internal links, shared Old2NewCTA) but hand-authored
// JSX instead of markdown since this isn't part of the blog library.
export default function AboutPage({ onSignUp, onLogin }) {
  useDocumentHead({
    title: ABOUT_META.title,
    description: ABOUT_META.description,
    canonical: ABOUT_META.canonical,
    image: ABOUT_META.image,
    jsonLd: [aboutPageJsonLd()],
  })

  return (
    <div style={{ background: 'white', minHeight: '100vh', fontFamily: SF, overflowX: 'hidden' }}>
      <PublicHeader onSignUp={onSignUp} onLogin={onLogin} />

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '0 0 40px' }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ padding: '20px 20px 0' }}>
          <ol style={{ display: 'flex', flexWrap: 'wrap', gap: 6, listStyle: 'none', fontSize: 13, color: TM, fontFamily: SF }}>
            <li><a href="/" style={{ color: TM, textDecoration: 'none' }}>Home</a></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" style={{ color: T, fontWeight: 600 }}>About</li>
          </ol>
        </nav>

        {/* Hero */}
        <header style={{ padding: '20px 20px 0' }}>
          <h1 style={{
            fontFamily: SRF, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700,
            color: T, letterSpacing: -1, lineHeight: 1.1, marginBottom: 12,
          }}>
            Our Story
          </h1>
          <p style={{ fontSize: 18, color: TM, lineHeight: 1.5, fontFamily: SF, marginBottom: 4 }}>
            Old2New began with one simple question: How can I keep eating the foods I love while making them healthier?
          </p>
        </header>

        {/* Body */}
        <div className="blog-content" style={{ padding: '8px 20px 0' }}>
          <h2>It Started With a Diagnosis</h2>
          <p>Nine years ago, everything changed.</p>
          <p>A diagnosis of stage 4 liver failure meant that almost everything I ate had to be rethought. Not adjusted. Not tweaked. Rethought.</p>
          <p>No processed food. No convenient shortcuts. Every label had to be read. Foods I'd eaten my whole life — the comfort foods that felt like home — suddenly had to be evaluated differently.</p>
          <p>What I couldn't do was give them up entirely.</p>
          <p>The meals that reminded me of family, of celebrations, of ordinary Tuesday nights — those weren't just food. They carried something. And I wasn't willing to let a diagnosis take that away too.</p>
          <p>So instead of stopping, I started transforming.</p>

          <h2>Better Ingredients. Same Comfort.</h2>
          <p>At first it was one recipe at a time. A familiar dish, reimagined with ingredients that worked better for my body without abandoning what made it worth eating.</p>
          <p>Slowly, I learned something that changed how I thought about food entirely:</p>
          <blockquote><p>The best version of a recipe isn't the original. It's the one that still tastes like home — and actually does something for you.</p></blockquote>
          <p>Comfort food was never the enemy. The ingredients inside it were where the opportunity lived.</p>

          <h2>Food Is the Hero</h2>
          <p>Old2New is built around one belief: food should never come with shame.</p>
          <p>Not the mac and cheese. Not the lasagna. Not the peach cobbler.</p>
          <p>These dishes carry memory, identity, and comfort in a way that a salad never will. The goal was never to replace them. The goal was to find the version of each one that could stay on the table — made with ingredients that support the body instead of working against it.</p>
          <p>Food is the hero. Always.</p>

          <h2>A Kitchen, Not a Diet</h2>
          <p>Diets have rules. Diets have forbidden foods. Diets have an end date.</p>
          <p>What I was building wasn't a diet. It was a different way of thinking about every ingredient in every recipe — asking not "can I eat this" but "how can I make this work for me."</p>
          <p>That's recipe transformation. And it turns out it works for everyone, not just people navigating a diagnosis.</p>
          <p>Whether you're managing a health condition, supporting a GLP-1 medication, trying to add more protein, or simply wanting the food you love to do more for your body — the starting point is always the same: the recipe you already love.</p>

          <h2>Why We Built the Knowledge Library</h2>
          <p>Over nine years of cooking this way, a library of knowledge built up. Which swaps actually work. Which ones change the dish in ways you'll notice. How the same lasagna can serve four completely different health goals. Why comfort food carries so much more than nutrition.</p>
          <p>Old2New is that library, made accessible.</p>
          <p>Not a diet plan. Not a meal kit. Not a list of things you can't have.</p>
          <p>A tool that starts with your recipe — the one you've been making for years, the one your family asks for, the one you're not willing to give up — and finds the version of it that works better for where you are right now.</p>

          <h2>Welcome to Old2New</h2>
          <p>Old → New.</p>
          <p>Not old gone. Not new instead.</p>
          <p>Old, transformed into something that works better for you — while staying recognizable as the thing you loved in the first place.</p>
          <p>There is good in everything. That includes the food on your table.</p>
          <p><em>Better ingredients. Same comfort.</em></p>
        </div>

        {/* Continue Exploring */}
        <div style={{ padding: '8px 20px 0' }}>
          <h2 style={{ fontFamily: SRF, fontSize: 22, fontWeight: 700, color: T, margin: '20px 0 14px', letterSpacing: -0.3 }}>
            Continue Exploring
          </h2>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CONTINUE_LINKS.map(({ href, label }) => (
              <li key={href}>
                <a href={href} style={{ color: 'var(--green-dark, #16A34A)', fontWeight: 600, fontSize: 15.5, textDecoration: 'underline', fontFamily: SF }}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA — one shared component, not duplicated. */}
        <div style={{ padding: '8px 20px 0' }}>
          <Old2NewCTA />
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
