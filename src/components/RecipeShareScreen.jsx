import { useState, useEffect } from 'react'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function RecipeShareScreen({ recipeId, onSignUp, onLogin }) {
  const [recipe, setRecipe]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState('recipe')
  const [copied, setCopied]     = useState(false)

  useEffect(() => {
    if (!recipeId) { setNotFound(true); setLoading(false); return }

    const fetchRecipe = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/saved_recipes?select=recipe_data&id=eq.${recipeId}`,
          {
            headers: {
              'apikey':        SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        )
        if (!res.ok) { setNotFound(true); return }
        const rows = await res.json()
        if (!rows.length) setNotFound(true)
        else setRecipe(rows[0].recipe_data)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchRecipe()
  }, [recipeId])

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(`https://old2new.app/recipe/${recipeId}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 48 }}>🌿</div>
        <div className="loading-dots"><span /><span /><span /></div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🍽️</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>Recipe not found</h2>
        <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 28 }}>This link may have expired or been removed.</p>
        <button className="btn btn-primary" onClick={onSignUp} style={{ maxWidth: 280, width: '100%' }}>
          Transform Your Own Recipes →
        </button>
      </div>
    )
  }

  const { transformedRecipe, originalName, ingredientSwaps, caloriesBefore, caloriesAfter, macros, whyTheseSwaps, diets } = recipe
  const calSaved = caloriesBefore - caloriesAfter
  const calPct   = caloriesBefore > 0 ? Math.round((Math.abs(calSaved) / caloriesBefore) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', background: 'white', paddingBottom: 100 }}>

      {/* Branded share header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--green-pale), #F0FDF4)',
        borderBottom: '1px solid var(--green-light)',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>🌿</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.4 }}>
            Old<span style={{ color: 'var(--amber)' }}>2</span><span style={{ color: 'var(--green)' }}>New</span>
          </span>
        </div>
        <button
          onClick={handleCopyLink}
          style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-dark)', background: 'white', border: '1px solid var(--green-light)', borderRadius: 10, padding: '5px 12px', cursor: 'pointer' }}
        >
          {copied ? '✓ Copied!' : '↑ Share'}
        </button>
      </div>

      {/* Recipe title */}
      <div style={{ padding: '20px 16px 8px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.6, lineHeight: 1.2, marginBottom: 8 }}>
          {transformedRecipe?.name || 'Transformed Recipe'}
        </h1>
        {diets?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {diets.map(d => <span key={d} className="badge badge-green">{d}</span>)}
          </div>
        )}
      </div>

      {/* Before / After */}
      <div className="results-comparison">
        <div className="compare-card before">
          <div className="compare-label">BEFORE</div>
          <div className="compare-name">{originalName || 'Original'}</div>
          <div className="compare-cal">{caloriesBefore}</div>
          <div className="compare-cal-label">calories</div>
        </div>
        <div className="compare-card after">
          <div className="compare-after-badge">NEW</div>
          <div className="compare-label">AFTER</div>
          <div className="compare-name">{transformedRecipe?.name}</div>
          <div className="compare-cal">{caloriesAfter}</div>
          <div className="compare-cal-label">calories</div>
          {calSaved > 0 && <div className="compare-saved">↓ {calSaved} cal saved ({calPct}%)</div>}
        </div>
      </div>

      <div className="divider" />

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)', position: 'sticky', top: 0, zIndex: 10, background: 'white' }}>
        {[['recipe', '📋 Recipe'], ['swaps', '🔄 Swaps']].map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)',
              color: activeTab === tab ? 'var(--green-dark)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--green)' : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'recipe' && (
        <div className="animate-in">
          {transformedRecipe?.servings && (
            <div style={{ display: 'flex', gap: 16, padding: '14px 16px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
              {[['Servings', transformedRecipe.servings], ['Prep', transformedRecipe.prepTime || '—'], ['Cook', transformedRecipe.cookTime || '—']].map(([label, val]) => (
                <div key={label} style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{val}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label.toUpperCase()}</div>
                </div>
              ))}
            </div>
          )}
          <div className="recipe-section">
            <p className="section-title">🛒 Ingredients</p>
            <div className="ingredient-list">
              {transformedRecipe?.ingredients?.map((ing, i) => (
                <div key={i} className="ingredient-item">
                  <div className="ingredient-dot" />
                  <span className="ingredient-amount">{ing.amount}</span>
                  <div style={{ flex: 1 }}>
                    <span className="ingredient-name">{ing.item}</span>
                    {ing.note && <div className="ingredient-note">← {ing.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="divider" />
          <div className="recipe-section">
            <p className="section-title">👨‍🍳 Instructions</p>
            <div className="instructions-list">
              {transformedRecipe?.instructions?.map((step, i) => (
                <div key={i} className="instruction-item">
                  <div className="instruction-num">{i + 1}</div>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'swaps' && (
        <div className="animate-in">
          <div className="section">
            <p className="section-label">Ingredient Swaps</p>
            <div className="swaps-list">
              {ingredientSwaps?.map((swap, i) => (
                <div key={i} className="swap-item">
                  <div className="swap-items-row">
                    <span className="swap-original">{swap.original}</span>
                    <span className="swap-arrow">→</span>
                    <span className="swap-new">{swap.swapped}</span>
                  </div>
                  <span className="swap-reason">{swap.reason}</span>
                </div>
              ))}
            </div>
          </div>
          {whyTheseSwaps && (
            <>
              <div className="divider" />
              <div className="section">
                <p className="section-title">💡 Why These Swaps</p>
                <div className="why-box">{whyTheseSwaps}</div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="disclaimer-badge" style={{ margin: '8px 16px' }}>
        <span className="disclaimer-badge-icon">⚠️</span>
        <p>Nutritional information is estimated. Always verify with your healthcare provider before making dietary changes.</p>
      </div>

      {/* Sticky CTA */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderTop: '1px solid var(--gray-200)',
        padding: '12px 16px 24px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <button className="btn btn-primary" onClick={onSignUp} style={{ fontSize: 15 }}>
          💾 Sign Up Free to Save This Recipe →
        </button>
        <button
          onClick={onLogin}
          style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}
        >
          Already have an account? Sign In
        </button>
      </div>
    </div>
  )
}
