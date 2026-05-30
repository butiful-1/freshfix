import { useState } from 'react'

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
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('recipe')

  if (!result) return null

  const { transformedRecipe, originalName, ingredientSwaps, caloriesBefore, caloriesAfter, macros, whyTheseSwaps, encouragement, diets } = result

  const calSaved = caloriesBefore - caloriesAfter
  const calPct = caloriesBefore > 0 ? Math.round((Math.abs(calSaved) / caloriesBefore) * 100) : 0

  const handleSave = () => {
    onSave()
    setSaved(true)
  }

  const handleShare = async () => {
    const text = `🌿 Old2New Recipe Transformation\n\n${transformedRecipe?.name || 'Transformed Recipe'}\n${caloriesAfter} calories · ${diets?.join(', ')}\n\nTransformed with Old2New\n⚠️ Not medical advice. Consult your doctor.`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Old2New Recipe', text })
      } catch {}
    } else {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="screen-header">
        <button className="back-btn" onClick={onStartOver} aria-label="Back">
          ←
        </button>
        <h1>{transformedRecipe?.name || 'Transformed Recipe'}</h1>
        <button className="btn-icon btn" onClick={handleShare} title={copied ? 'Copied!' : 'Share'} style={{ background: 'transparent' }}>
          {copied ? '✓' : '↑'}
        </button>
      </div>

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
        <button
          className={`btn ${saved ? 'btn-secondary' : 'btn-primary'}`}
          onClick={handleSave}
          disabled={saved}
        >
          {saved ? '✓ Recipe Saved' : '💾 Save Recipe'}
        </button>

        <div className="btn-row">
          <button className="btn btn-outline" onClick={onShoppingList}>
            🛒 Shopping List
          </button>
          <button className="btn btn-outline" onClick={handleShare}>
            {copied ? '✓ Copied!' : '↑ Share'}
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
