import { useState, useEffect } from 'react'

const MACRO_COLORS = {
  protein: '#22C55E',
  carbs: '#FF9800',
  fat: '#2196F3',
  fiber: '#9C27B0',
}

function MacroBar({ label, before, after, color }) {
  const max = Math.max(before, after, 1)
  const pctBefore = Math.min((before / max) * 100, 100)
  const pctAfter = Math.min((after / max) * 100, 100)
  const change = before > 0 ? Math.round(((after - before) / before) * 100) : 0
  const up = after >= before

  return (
    <div className="macro-row">
      <span className="macro-label">{label}</span>
      <div className="macro-bars">
        <div className="macro-bar-row">
          <div className="macro-bar-track">
            <div className="macro-bar-fill" style={{ width: `${pctBefore}%`, background: '#E0E0E0' }} />
          </div>
          <span className="macro-bar-label" style={{ color: 'var(--gray-500)' }}>{before}g</span>
        </div>
        <div className="macro-bar-row">
          <div className="macro-bar-track">
            <div className="macro-bar-fill" style={{ width: `${pctAfter}%`, background: color }} />
          </div>
          <span className="macro-bar-label" style={{ color }}>{after}g</span>
        </div>
      </div>
      <span className={`macro-change ${up ? 'macro-up' : 'macro-down'}`}>
        {change > 0 ? '+' : ''}{change}%
      </span>
    </div>
  )
}

export default function ResultsScreen({ result, onSave, onShoppingList, onStartOver, savedRecipes }) {
  const [saved, setSaved] = useState(() => savedRecipes?.some(r => r.id === result?.id))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('recipe')
  const [ingredients, setIngredients] = useState(() => result?.transformedRecipe?.ingredients || [])
  const [newIngredient, setNewIngredient] = useState('')
  const [ingredientsModified, setIngredientsModified] = useState(false)
  const [userNotes, setUserNotes] = useState('')
  const [imageReady, setImageReady] = useState(false)

  // Reset image state when a new recipe loads
  useEffect(() => { setImageReady(false) }, [result?.id])

  const removeIngredient = (index) => {
    setIngredients(prev => prev.filter((_, i) => i !== index))
    setIngredientsModified(true)
  }

  const addIngredient = () => {
    const text = newIngredient.trim()
    if (!text) return
    setIngredients(prev => [...prev, { item: text, amount: '' }])
    setNewIngredient('')
    setIngredientsModified(true)
  }

  if (!result) return null

  const { transformedRecipe, originalName, ingredientSwaps, caloriesBefore, caloriesAfter, macros, whyTheseSwaps, encouragement, diets } = result

  const calSaved = caloriesBefore - caloriesAfter
  const calPct = caloriesBefore > 0 ? Math.round((Math.abs(calSaved) / caloriesBefore) * 100) : 0

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    try {
      await onSave(ingredients)
      setSaved(true)
    } catch (e) {
      setSaveError(e.message || 'Could not save recipe. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isSaved = saved || savedRecipes?.some(r => r.id === result?.id)
  const shareUrl = isSaved && typeof result.id === 'string' && result.id.includes('-')
    ? `https://old2new.app/recipe/${result.id}`
    : null

  const handleShare = async () => {
    if (shareUrl) {
      try {
        if (navigator.share) {
          await navigator.share({ title: transformedRecipe?.name || 'Old2New Recipe', url: shareUrl })
        } else {
          await navigator.clipboard.writeText(shareUrl)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
      } catch {}
    } else {
      const text = `🌿 Old2New Recipe Transformation\n\n${transformedRecipe?.name || 'Transformed Recipe'}\n${caloriesAfter} calories · ${diets?.join(', ')}\n\nTransformed with Old2New\n⚠️ Not medical advice. Consult your doctor.`
      if (navigator.share) {
        try { await navigator.share({ title: 'Old2New Recipe', text }) } catch {}
      } else {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="screen-header">
        <button
          className="back-btn"
          onClick={onStartOver}
          aria-label="Back to home"
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700 }}
        >
          <span>←</span>
          <span>Home</span>
        </button>
        <h1>{transformedRecipe?.name || 'Transformed Recipe'}</h1>
        <button className="btn-icon btn" onClick={handleShare} title={copied ? 'Copied!' : shareUrl ? 'Copy link' : 'Share'} style={{ background: 'transparent' }}>
          {copied ? '✓' : '↑'}
        </button>
      </div>

      {/* Hero image — skeleton while generating, fades in when ready */}
      {result.imagePrompt && (
        <div style={{ position: 'relative', width: '100%', height: 260, overflow: 'hidden', background: 'var(--gray-100)' }}>
          {(!result.imageUrl || !imageReady) && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ fontSize: 36 }}>🍽️</div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                {result.imageUrl ? 'Loading image…' : 'Preparing your recipe image…'}
              </p>
              <div className="loading-dots" style={{ transform: 'scale(0.65)' }}><span /><span /><span /></div>
            </div>
          )}
          {result.imageUrl && (
            <>
              <img
                key={result.imageUrl}
                src={result.imageUrl}
                alt={transformedRecipe?.name}
                onLoad={() => setImageReady(true)}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: imageReady ? 1 : 0, transition: 'opacity 0.5s ease' }}
              />
              {imageReady && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '28px 12px 10px', background: 'linear-gradient(transparent, rgba(0,0,0,0.45))', fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 500, textAlign: 'center', letterSpacing: 0.4 }}>
                  🌿 Created with Old2New
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Encouragement */}
      {encouragement && (
        <div style={{ padding: '12px 16px 0', animation: 'fadeUp 0.4s 0.1s ease both', opacity: 0, animationFillMode: 'forwards' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--green-pale), #F9FBE7)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius)', padding: '12px 14px', fontSize: 14, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>
            ✨ {encouragement}
          </div>
        </div>
      )}

      {/* Before / After comparison */}
      <div className="results-comparison">
        <div className="compare-card before">
          <div className="compare-label">BEFORE</div>
          <div className="compare-name">{originalName || 'Original Recipe'}</div>
          <div className="compare-cal">{caloriesBefore}</div>
          <div className="compare-cal-label">calories</div>
        </div>
        <div className="compare-card after">
          <div className="compare-after-badge">NEW</div>
          <div className="compare-label">AFTER</div>
          <div className="compare-name">{transformedRecipe?.name}</div>
          <div className="compare-cal">{caloriesAfter}</div>
          <div className="compare-cal-label">calories</div>
          {calSaved > 0 && (
            <div className="compare-saved">↓ {calSaved} cal saved ({calPct}%)</div>
          )}
          {calSaved < 0 && (
            <div className="compare-saved" style={{ background: '#FFF3E0', borderColor: '#FFB74D', color: '#E65100' }}>
              +{Math.abs(calSaved)} cal (more protein)
            </div>
          )}
        </div>
      </div>

      {/* Diet badges */}
      {diets?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 16px 16px' }}>
          {diets.map(d => <span key={d} className="badge badge-green">{d}</span>)}
        </div>
      )}

      <div className="divider" />

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)', position: 'sticky', top: 'var(--header-h)', zIndex: 10, background: 'white' }}>
        {[['recipe', '📋 Recipe'], ['swaps', '🔄 Swaps'], ['macros', '📊 Macros']].map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)',
              color: activeTab === tab ? 'var(--green-dark)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--green)' : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.15s'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Recipe */}
      {activeTab === 'recipe' && (
        <div className="animate-in">
          {transformedRecipe?.servings && (
            <div style={{ display: 'flex', gap: 16, padding: '14px 16px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{transformedRecipe.servings}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>SERVINGS</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{transformedRecipe.prepTime || '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>PREP</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{transformedRecipe.cookTime || '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>COOK</div>
              </div>
            </div>
          )}

          <div className="recipe-section">
            <p className="section-title">🛒 Ingredients</p>
            <div className="ingredient-list">
              {ingredients.map((ing, i) => (
                <div key={i} className="ingredient-item" style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div className="ingredient-dot" />
                  <span className="ingredient-amount">{ing.amount}</span>
                  <div style={{ flex: 1 }}>
                    <span className="ingredient-name">{ing.item}</span>
                    {ing.note && <div className="ingredient-note">← {ing.note}</div>}
                  </div>
                  <button
                    onClick={() => removeIngredient(i)}
                    aria-label={`Remove ${ing.item}`}
                    style={{
                      flexShrink: 0, marginLeft: 8, width: 22, height: 22,
                      border: 'none', borderRadius: '50%', background: 'var(--gray-200)',
                      color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13,
                      lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                type="text"
                value={newIngredient}
                onChange={e => setNewIngredient(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addIngredient()}
                placeholder="Add ingredient…"
                style={{
                  flex: 1, padding: '8px 12px', border: '1px solid var(--gray-200)',
                  borderRadius: 8, fontSize: 13, fontFamily: 'var(--font)',
                  color: 'var(--text-primary)', outline: 'none',
                }}
              />
              <button
                onClick={addIngredient}
                disabled={!newIngredient.trim()}
                style={{
                  padding: '8px 14px', border: 'none', borderRadius: 8,
                  background: 'var(--green)', color: 'white', fontSize: 13,
                  fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)',
                  opacity: newIngredient.trim() ? 1 : 0.45,
                }}
              >
                + Add
              </button>
            </div>

            {ingredientsModified && (
              <div style={{
                marginTop: 14, padding: '12px 14px',
                background: '#FFFBEB', border: '1px solid #FCD34D',
                borderRadius: 10,
              }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>
                  📝 Heads Up!
                </p>
                <p style={{ fontSize: 13, color: '#78350F', lineHeight: 1.5, marginBottom: 10 }}>
                  You've modified the ingredients. Remember to adjust the recipe instructions accordingly — cooking times and methods may need to change based on your substitutions.
                </p>
                <textarea
                  value={userNotes}
                  onChange={e => setUserNotes(e.target.value)}
                  placeholder="Your notes… e.g. replaced chicken with broccoli — roast at 400°F for 20 mins"
                  rows={3}
                  style={{
                    width: '100%', padding: '8px 10px', border: '1px solid #FCD34D',
                    borderRadius: 8, fontSize: 13, fontFamily: 'var(--font)',
                    color: 'var(--text-primary)', background: 'white',
                    resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            )}
          </div>

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

      {/* Tab: Swaps */}
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

          <div className="divider" />

          <div className="section">
            <p className="section-title">💡 Why These Swaps</p>
            <div className="why-box">{whyTheseSwaps}</div>
          </div>
        </div>
      )}

      {/* Tab: Macros */}
      {activeTab === 'macros' && (
        <div className="animate-in">
          <div style={{ padding: '16px 16px 8px', background: 'var(--gray-50)', margin: '0 16px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--gray-700)' }}>{caloriesBefore}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>BEFORE (cal)</div>
              </div>
              <div style={{ fontSize: 24, color: 'var(--green)', alignSelf: 'center', fontWeight: 800 }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green-dark)' }}>{caloriesAfter}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>AFTER (cal)</div>
              </div>
            </div>
          </div>

          <div className="section" style={{ marginTop: 8 }}>
            <p className="section-label" style={{ marginBottom: 6 }}>
              Gray = Before · Colored = After
            </p>
            <div className="macros-grid">
              <MacroBar label="Protein" before={macros?.before?.protein || 0} after={macros?.after?.protein || 0} color={MACRO_COLORS.protein} />
              <MacroBar label="Carbs" before={macros?.before?.carbs || 0} after={macros?.after?.carbs || 0} color={MACRO_COLORS.carbs} />
              <MacroBar label="Fat" before={macros?.before?.fat || 0} after={macros?.after?.fat || 0} color={MACRO_COLORS.fat} />
              <MacroBar label="Fiber" before={macros?.before?.fiber || 0} after={macros?.after?.fiber || 0} color={MACRO_COLORS.fiber} />
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer badge */}
      <div className="disclaimer-badge" style={{ margin: '8px 16px' }}>
        <span className="disclaimer-badge-icon">⚠️</span>
        <p>Nutritional information is estimated. Always verify with your healthcare provider before making dietary changes.</p>
      </div>

      {/* Action buttons */}
      <div className="action-buttons">
        {saveError && (
          <div className="error-msg" style={{ marginBottom: 10 }}>
            <span className="error-icon">⚠️</span>
            <span>{saveError}</span>
          </div>
        )}
        <button
          className={`btn ${saved ? 'btn-secondary' : 'btn-primary'}`}
          onClick={handleSave}
          disabled={saved || saving}
        >
          {saving ? <><div className="spinner" /> Saving…</> : saved ? '✓ Recipe Saved' : '💾 Save Recipe'}
        </button>

        <div className="btn-row">
          <button className="btn btn-outline" onClick={onShoppingList}>
            🛒 Shopping List
          </button>
          <button className="btn btn-outline" onClick={handleShare}>
            {copied ? '✓ Copied!' : shareUrl ? '🔗 Copy Link' : '↑ Share'}
          </button>
        </div>

        <button className="btn btn-ghost" onClick={onStartOver}>
          ← Transform Another Recipe
        </button>
      </div>

      <div className="footer-disclaimer">
        <p>Old2New is for informational purposes only. Not medical advice. Consult your physician before changing your diet.</p>
      </div>
    </div>
  )
}
