import { useRef, useState } from 'react'
import { MacroBar, MACRO_COLORS } from './MacroBar.jsx'
import { isPlaceholder } from '../../data/publicRecipes.js'

const TABS = [
  { id: 'recipe', label: 'Recipe', icon: '📋' },
  { id: 'swaps', label: 'Swaps', icon: '🔄' },
  { id: 'macros', label: 'Macros', icon: '📊' },
]

// Read-only public counterpart to the tab section of ResultsScreen.jsx.
// Reuses the exact same CSS classes (ingredient-list, instructions-list,
// swap-item, macros-grid, disclaimer-badge, etc.) and the shared MacroBar
// component so it looks identical to what a signed-in user sees after a
// real transformation — but with no add/remove/save/report controls, and
// with full ARIA tab semantics + keyboard support (mouse, touch, and
// keyboard arrow/Enter navigation), which the original screen doesn't need
// since it's already inside an app shell rather than a public page.
export default function RecipeResultTabs({ recipe, onSignUp }) {
  const [activeTab, setActiveTab] = useState('recipe')
  const tabRefs = useRef({})

  const ingredientsReady = Array.isArray(recipe.ingredients) &&
    recipe.ingredients.length > 0 && !isPlaceholder(recipe.ingredients[0]?.item)
  const instructionsReady = Array.isArray(recipe.instructions) &&
    recipe.instructions.length > 0 && !isPlaceholder(recipe.instructions[0])
  const swapsReady = Array.isArray(recipe.swaps) &&
    recipe.swaps.length > 0 && !isPlaceholder(recipe.swaps[0]?.original)
  const whyReady = !isPlaceholder(recipe.whyTheseSwaps)
  const macrosReady = !!recipe.macrosBefore && !!recipe.macrosAfter

  const focusTab = (id) => tabRefs.current[id]?.focus()

  const handleKeyDown = (e) => {
    const idx = TABS.findIndex(t => t.id === activeTab)
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const dir = e.key === 'ArrowRight' ? 1 : -1
      const next = TABS[(idx + dir + TABS.length) % TABS.length]
      setActiveTab(next.id)
      focusTab(next.id)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveTab(TABS[0].id)
      focusTab(TABS[0].id)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActiveTab(TABS[TABS.length - 1].id)
      focusTab(TABS[TABS.length - 1].id)
    }
  }

  return (
    <div>
      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Recipe details"
        style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)', background: 'white' }}
        onKeyDown={handleKeyDown}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            ref={el => { tabRefs.current[tab.id] = el }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)',
              color: activeTab === tab.id ? 'var(--green-dark)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--green)' : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.15s',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Recipe tab */}
      <div
        role="tabpanel"
        id="tabpanel-recipe"
        aria-labelledby="tab-recipe"
        hidden={activeTab !== 'recipe'}
        tabIndex={0}
      >
        <div className="animate-in">
            <div style={{ display: 'flex', gap: 16, padding: '14px 16px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{recipe.servings || '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>SERVINGS</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{recipe.prepTime || '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>PREP</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{recipe.cookTime || '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>COOK</div>
              </div>
            </div>

            <div className="recipe-section">
              <p className="section-title">🛒 Ingredients</p>
              {ingredientsReady ? (
                <div className="ingredient-list">
                  {recipe.ingredients.map((ing, i) => (
                    <div key={i} className="ingredient-item" style={{ display: 'flex', alignItems: 'flex-start' }}>
                      <div className="ingredient-dot" />
                      <span className="ingredient-amount">{ing.amount}</span>
                      <div style={{ flex: 1 }}>
                        <span className="ingredient-name">{ing.item}</span>
                        {ing.note && <div className="ingredient-note">← {ing.note}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ComingSoon />
              )}
              {recipe.ingredientNotes?.length > 0 && (
                <ul style={{ marginTop: 10, paddingLeft: 18, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {recipe.ingredientNotes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              )}
            </div>

            <div className="recipe-section">
              <p className="section-title">👨‍🍳 Instructions</p>
              {instructionsReady ? (
                <div className="instructions-list">
                  {recipe.instructions.map((step, i) => (
                    <div key={i} className="instruction-item">
                      <div className="instruction-num">{i + 1}</div>
                      <p>{step}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <ComingSoon />
              )}
            </div>

            <div className="disclaimer-badge" style={{ margin: '8px 16px' }}>
              <span className="disclaimer-badge-icon">⚠️</span>
              <p>Nutritional information is estimated. Always verify with your healthcare provider before making dietary changes.</p>
            </div>

            <div style={{ padding: '4px 16px 16px' }}>
              <button className="btn btn-outline" style={{ width: '100%' }} onClick={onSignUp}>
                🛒 Create a Shopping List
              </button>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
                Free account required to build and save shopping lists.
              </p>
            </div>
          </div>
      </div>

      {/* Swaps tab */}
      <div
        role="tabpanel"
        id="tabpanel-swaps"
        aria-labelledby="tab-swaps"
        hidden={activeTab !== 'swaps'}
        tabIndex={0}
      >
        <div className="animate-in">
            <div className="section" style={{ padding: '16px 16px 0' }}>
              <p className="section-label">Ingredient Swaps</p>
              {swapsReady ? (
                <div className="swaps-list">
                  {recipe.swaps.map((swap, i) => (
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
              ) : (
                <ComingSoon />
              )}
            </div>

            <div className="divider" />

            <div className="section" style={{ padding: '16px' }}>
              <p className="section-title">💡 Why These Swaps</p>
              {whyReady ? (
                <div className="why-box">{recipe.whyTheseSwaps}</div>
              ) : (
                <ComingSoon />
              )}
              <div className="disclaimer-badge" style={{ margin: '14px 0 0' }}>
                <span className="disclaimer-badge-icon">⚠️</span>
                <p>This information is for general education only, not medical advice. Individual needs vary — please consult your doctor or a registered dietitian before making dietary changes.</p>
              </div>
            </div>
          </div>
      </div>

      {/* Macros tab */}
      <div
        role="tabpanel"
        id="tabpanel-macros"
        aria-labelledby="tab-macros"
        hidden={activeTab !== 'macros'}
        tabIndex={0}
      >
        <div className="animate-in">
            {macrosReady ? (
              <>
                {typeof recipe.caloriesBefore === 'number' && typeof recipe.caloriesAfter === 'number' && (
                  <div style={{ padding: '16px 16px 8px', background: 'var(--gray-50)', margin: '16px 16px 0', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--gray-700)' }}>{recipe.caloriesBefore}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>BEFORE (cal, est.)</div>
                      </div>
                      <div style={{ fontSize: 24, color: 'var(--green)', alignSelf: 'center', fontWeight: 800 }}>→</div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green-dark)' }}>{recipe.caloriesAfter}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>AFTER (cal, est.)</div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="section" style={{ marginTop: 8, padding: '0 16px' }}>
                  <p className="section-label" style={{ marginBottom: 6 }}>
                    Gray = Before · Colored = After (estimated values)
                  </p>
                  <div className="macros-grid">
                    <MacroBar label="Protein" before={recipe.macrosBefore.protein || 0} after={recipe.macrosAfter.protein || 0} color={MACRO_COLORS.protein} />
                    <MacroBar label="Carbs" before={recipe.macrosBefore.carbs || 0} after={recipe.macrosAfter.carbs || 0} color={MACRO_COLORS.carbs} />
                    <MacroBar label="Fat" before={recipe.macrosBefore.fat || 0} after={recipe.macrosAfter.fat || 0} color={MACRO_COLORS.fat} />
                    <MacroBar label="Fiber" before={recipe.macrosBefore.fiber || 0} after={recipe.macrosAfter.fiber || 0} color={MACRO_COLORS.fiber} />
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: '16px' }}><ComingSoon /></div>
            )}
            <div className="disclaimer-badge" style={{ margin: '16px' }}>
              <span className="disclaimer-badge-icon">⚠️</span>
              <p>All values are estimates. Always verify with your healthcare provider before making dietary changes.</p>
            </div>
          </div>
      </div>
    </div>
  )
}

function ComingSoon() {
  return (
    <div style={{
      padding: '18px 16px', background: 'var(--gray-50)', border: '1px dashed var(--gray-300)',
      borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6,
    }}>
      Full recipe content for this transformation is being finalized — check back soon.
    </div>
  )
}
