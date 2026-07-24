import { useEffect, useRef } from 'react'
import { isPlaceholder } from '../data/publicRecipes.js'
import RecipeResultTabs from './shared/RecipeResultTabs.jsx'

const T   = '#111827'
const TM  = '#6B7280'
const G   = '#22C55E'
const GD  = '#16A34A'
const SF  = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const SRF = 'Georgia, "Times New Roman", serif'

// Homepage "quick view" for a showcase recipe — opens as a modal/lightbox over
// the homepage (Amazon/Etsy/Shopify-style product quick view) so a visitor can
// read a full recipe transformation without ever leaving the page or (if
// signed in) being pulled into the app. Content mirrors the standalone
// /recipes/:slug page (PublicRecipePage.jsx) — same recipe record, same
// shared RecipeResultTabs component — just presented in a dialog instead of
// a full page with header/footer chrome. That standalone page still exists
// unchanged for direct links (see SplashScreen.jsx for how the two connect).
export default function RecipeQuickViewModal({ recipe, onClose, onSignUp }) {
  const closeBtnRef = useRef(null)
  const previouslyFocused = useRef(null)

  useEffect(() => {
    previouslyFocused.current = document.activeElement
    closeBtnRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
      if (previouslyFocused.current?.focus) previouslyFocused.current.focus()
    }
  }, [onClose])

  if (!recipe) return null

  const hasCalories = typeof recipe.caloriesBefore === 'number' && typeof recipe.caloriesAfter === 'number'
  const calSaved = hasCalories ? recipe.caloriesBefore - recipe.caloriesAfter : null
  const calPct = hasCalories && recipe.caloriesBefore > 0 ? Math.round((Math.abs(calSaved) / recipe.caloriesBefore) * 100) : null

  return (
    <div
      className="recipe-modal-overlay"
      role="presentation"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="recipe-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-modal-title"
      >
        <button
          ref={closeBtnRef}
          onClick={onClose}
          aria-label="Close recipe"
          className="recipe-modal-close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="recipe-modal-scroll">
          {/* Hero image */}
          <div style={{ position: 'relative' }}>
            <img
              src={recipe.heroImage}
              alt={recipe.heroImageAlt}
              style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' }}
            />
            <div style={{
              position: 'absolute', bottom: 12, left: 20, padding: '5px 12px',
              background: 'rgba(0,0,0,0.55)', borderRadius: 20, fontSize: 12,
              color: 'white', fontWeight: 600, fontFamily: SF,
            }}>
              🌿 Created with Old2New
            </div>
          </div>

          <div style={{ padding: '24px 28px 0' }}>
            {/* Goal badge(s) */}
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

            {/* Title */}
            <h2 id="recipe-modal-title" style={{
              fontFamily: SRF, fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 700,
              color: T, letterSpacing: -1, lineHeight: 1.15, marginBottom: 14,
            }}>
              {recipe.title}
            </h2>

            {/* Short description */}
            {isPlaceholder(recipe.summary) ? (
              <p style={{ fontSize: 14, color: TM, fontStyle: 'italic', marginBottom: 8 }}>
                Full intro copy for this transformation is being finalized — check back soon.
              </p>
            ) : (
              <p style={{ fontSize: 16, color: TM, lineHeight: 1.7, fontFamily: SF, marginBottom: 8 }}>
                {recipe.summary}
              </p>
            )}

            {/* Before/after calories, condensed */}
            {hasCalories && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14, marginTop: 18,
                padding: '14px 16px', background: 'var(--gray-50)',
                border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)',
              }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-700)' }}>{recipe.caloriesBefore}</div>
                  <div style={{ fontSize: 10, color: TM }}>BEFORE (cal, est.)</div>
                </div>
                <div style={{ fontSize: 20, color: G, fontWeight: 800 }}>→</div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: GD }}>{recipe.caloriesAfter}</div>
                  <div style={{ fontSize: 10, color: TM }}>AFTER (cal, est.)</div>
                  {calSaved > 0 && (
                    <div style={{ fontSize: 11, color: GD, fontWeight: 700, marginTop: 2 }}>
                      ↓ {calSaved} cal{calPct !== null ? ` (${calPct}%)` : ''}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Ingredients / Instructions / Swaps ("Why these swaps work") / Nutrition */}
          <div style={{ marginTop: 24 }}>
            <RecipeResultTabs recipe={recipe} onSignUp={onSignUp} />
          </div>

          {/* Bottom CTA */}
          <div style={{
            margin: '8px 20px 28px', padding: '28px 24px', background: 'var(--green-bg, #F0FDF4)',
            border: '1px solid rgba(34,197,94,0.2)', borderRadius: 16, textAlign: 'center',
          }}>
            <p style={{ fontSize: 16, color: T, lineHeight: 1.6, marginBottom: 18, fontFamily: SF, fontWeight: 600 }}>
              Love this recipe? Transform your own favorite recipes with Old2New.
            </p>
            <button className="btn btn-primary" style={{ width: 'auto', padding: '15px 36px' }} onClick={onSignUp}>
              Get Started Free
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
