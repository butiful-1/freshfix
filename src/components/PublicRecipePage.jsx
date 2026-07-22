import useDocumentHead from '../seo/useDocumentHead.js'
import { recipeJsonLd, recipePageMeta, breadcrumbJsonLd } from '../seo/seoHelpers.js'
import { getPublicRecipeBySlug, SUPPORTED_HEALTH_GOALS, isPlaceholder } from '../data/publicRecipes.js'
import { PublicHeader, PublicFooter } from './shared/PublicPageChrome.jsx'
import RecipeResultTabs from './shared/RecipeResultTabs.jsx'

const T   = '#111827'
const TM  = '#6B7280'
const GD  = '#16A34A'
const SF  = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const SRF = 'Georgia, "Times New Roman", serif'

// One reusable template, driven entirely by a record from
// src/data/publicRecipes.js. To add a new public transformation page, add a
// record to that file — this component and its route both pick it up
// automatically (see src/App.jsx path.startsWith('/recipes/') handling).
export default function PublicRecipePage({ slug, onSignUp, onLogin }) {
  const recipe = getPublicRecipeBySlug(slug)

  const meta = recipe ? recipePageMeta(recipe) : null
  useDocumentHead(recipe ? {
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
  } : {})

  if (!recipe) {
    return (
      <div style={{ background: 'white', minHeight: '100vh', fontFamily: SF }}>
        <PublicHeader onSignUp={onSignUp} onLogin={onLogin} />
        <div style={{ padding: '96px 40px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: SRF, fontSize: 32, color: T, marginBottom: 16 }}>Recipe not found</h1>
          <p style={{ color: TM, marginBottom: 24 }}>This recipe transformation doesn't exist (yet).</p>
          <a href="/recipes" style={{ color: GD, fontWeight: 600 }}>← Browse all recipe transformations</a>
        </div>
        <PublicFooter />
      </div>
    )
  }

  const hasCalories = typeof recipe.caloriesBefore === 'number' && typeof recipe.caloriesAfter === 'number'
  const calSaved = hasCalories ? recipe.caloriesBefore - recipe.caloriesAfter : null
  const calPct = hasCalories && recipe.caloriesBefore > 0 ? Math.round((Math.abs(calSaved) / recipe.caloriesBefore) * 100) : null

  return (
    <div style={{ background: 'white', minHeight: '100vh', fontFamily: SF, overflowX: 'hidden' }}>
      <PublicHeader onSignUp={onSignUp} onLogin={onLogin} />

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '0 0 40px' }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ padding: '20px 20px 0' }}>
          <ol style={{ display: 'flex', flexWrap: 'wrap', gap: 6, listStyle: 'none', fontSize: 13, color: TM, fontFamily: SF }}>
            <li><a href="/" style={{ color: TM, textDecoration: 'none' }}>Home</a></li>
            <li aria-hidden="true">/</li>
            <li><a href="/recipes" style={{ color: TM, textDecoration: 'none' }}>Recipes</a></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" style={{ color: T, fontWeight: 600 }}>{recipe.title}</li>
          </ol>
        </nav>

        {/* Title + health goal(s) */}
        <header style={{ padding: '20px 20px 0' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {(recipe.healthGoals || [recipe.healthGoal]).map(goal => (
              <span key={goal} style={{
                display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: 1,
                textTransform: 'uppercase', color: GD, background: 'var(--green-pale)',
                borderRadius: 20, padding: '4px 12px', fontFamily: SF,
              }}>
                {goal}
              </span>
            ))}
          </div>
          <h1 style={{
            fontFamily: SRF, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700,
            color: T, letterSpacing: -1, lineHeight: 1.1, marginBottom: 12,
          }}>
            {recipe.title}
          </h1>
        </header>

        {/* Hero image */}
        <div style={{ position: 'relative', margin: '20px 0', padding: '0 20px' }}>
          <img
            src={recipe.heroImage}
            alt={recipe.heroImageAlt}
            style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 12, display: 'block' }}
          />
          <div style={{
            position: 'absolute', bottom: 8, left: 28, padding: '5px 12px',
            background: 'rgba(0,0,0,0.55)', borderRadius: 20, fontSize: 12,
            color: 'white', fontWeight: 600, fontFamily: SF,
          }}>
            🌿 Created with Old2New
          </div>
        </div>

        {/* Intro */}
        <div style={{ padding: '0 20px' }}>
          {isPlaceholder(recipe.summary) ? (
            <p style={{ fontSize: 15, color: TM, fontStyle: 'italic' }}>
              Full intro copy for this transformation is being finalized — check back soon.
            </p>
          ) : (
            <p style={{ fontSize: 17, color: TM, lineHeight: 1.75, fontFamily: SF }}>
              {recipe.summary}
            </p>
          )}
        </div>

        {/* Before / after comparison */}
        <h2 style={{ fontFamily: SRF, fontSize: 20, fontWeight: 700, color: T, padding: '28px 20px 0' }}>
          Before &amp; After
        </h2>
        <div className="results-comparison">
          <div className="compare-card before">
            <div className="compare-label">BEFORE</div>
            <div className="compare-name">{recipe.originalTitle}</div>
            {recipe.originalRecipeUrl && (
              <a href={recipe.originalRecipeUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: TM }}>
                Original recipe ↗
              </a>
            )}
            {hasCalories ? (
              <>
                <div className="compare-cal">{recipe.caloriesBefore}</div>
                <div className="compare-cal-label">calories (est.)</div>
              </>
            ) : (
              <div className="compare-cal-label">Estimate coming soon</div>
            )}
          </div>
          <div className="compare-card after">
            <div className="compare-after-badge">NEW</div>
            <div className="compare-label">AFTER</div>
            <div className="compare-name">{recipe.title}</div>
            {hasCalories ? (
              <>
                <div className="compare-cal">{recipe.caloriesAfter}</div>
                <div className="compare-cal-label">calories (est.)</div>
                {calSaved > 0 && (
                  <div className="compare-saved">↓ {calSaved} cal saved{calPct !== null ? ` (${calPct}%)` : ''}</div>
                )}
              </>
            ) : (
              <div className="compare-cal-label">Estimate coming soon</div>
            )}
          </div>
        </div>

        {/* CTA 1 */}
        <CtaBlock onSignUp={onSignUp} title="Love this transformation?" sub="See what Old2New can do with your favorite recipe." />

        {/* Tabs */}
        <h2 style={{ fontFamily: SRF, fontSize: 20, fontWeight: 700, color: T, padding: '36px 20px 0' }}>
          Full Recipe
        </h2>
        <RecipeResultTabs recipe={recipe} onSignUp={onSignUp} />

        {/* CTA 2 */}
        <div style={{ padding: '8px 20px 0' }}>
          <CtaBlock
            onSignUp={onSignUp}
            title="Ready to transform your own favorite recipe?"
            sub="Old2New transforms the food you already love into fresh versions tailored to your goals."
            showGoals
          />
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}

function CtaBlock({ onSignUp, title, sub, showGoals }) {
  return (
    <section style={{
      margin: '28px 20px 0', padding: '32px 24px', background: 'var(--green-bg, #F0FDF4)',
      border: '1px solid rgba(34,197,94,0.2)', borderRadius: 16, textAlign: 'center',
    }}>
      <h3 style={{ fontFamily: SRF, fontSize: 22, fontWeight: 700, color: T, marginBottom: 8, letterSpacing: -0.5 }}>
        {title}
      </h3>
      <p style={{ fontSize: 15, color: TM, lineHeight: 1.65, marginBottom: showGoals ? 18 : 22, fontFamily: SF }}>
        {sub}
      </p>
      {showGoals && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 22 }}>
          {SUPPORTED_HEALTH_GOALS.map(goal => (
            <span key={goal} className="badge badge-green">{goal}</span>
          ))}
        </div>
      )}
      <button className="btn btn-primary" style={{ width: 'auto', padding: '15px 32px' }} onClick={onSignUp}>
        Start Your Own Recipe Transformation
      </button>
      <p style={{ fontSize: 12.5, color: TM, marginTop: 10, fontFamily: SF }}>
        Free account. No credit card required.
      </p>
    </section>
  )
}
