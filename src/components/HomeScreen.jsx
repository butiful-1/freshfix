const DIETS = [
  { id: 'GLP-1 Friendly', label: 'GLP-1 Friendly', icon: '💊' },
  { id: 'Keto', label: 'Keto', icon: '🥑' },
  { id: 'Mediterranean', label: 'Mediterranean', icon: '🫒' },
  { id: 'High Protein', label: 'High Protein', icon: '💪' },
  { id: 'Low Sugar', label: 'Low Sugar', icon: '🍬' },
  { id: 'Low Calorie', label: 'Low Calorie', icon: '🔥' },
  { id: 'Diabetic Friendly', label: 'Diabetic Friendly', icon: '❤️' },
]

const DIET_EMOJI = { 'GLP-1 Friendly': '💊', Keto: '🥑', Mediterranean: '🫒', 'High Protein': '💪', 'Low Sugar': '🍬', 'Low Calorie': '🔥', 'Diabetic Friendly': '❤️' }

export default function HomeScreen({
  recipeInput, onRecipeChange,
  selectedDiets, onDietToggle,
  onTransform, isLoading, error,
  savedRecipes, onViewSaved,
  plan, swapUsage, onUpgrade, transformLimit,
  dietaryPreferences,
}) {
  const canTransform = recipeInput.trim().length > 0 && selectedDiets.length > 0 && !isLoading
  const recent = savedRecipes.slice(0, 3)
  const swapsUsed = swapUsage?.count || 0
  const activePrefCount = Object.entries(dietaryPreferences || {}).filter(([k, v]) =>
    k === 'custom' ? v?.trim() : v
  ).length
  const swapsLeft = transformLimit !== undefined ? Math.max(0, transformLimit - swapsUsed) : null
  const atLimit = transformLimit !== undefined && swapsLeft === 0
  const isLifetime = false

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="home-header">
        <div className="header-logo">
          <div className="header-logo-icon">🌿</div>
          <span className="header-logo-text">Old<span style={{color:'var(--amber)'}}>2</span><span>New</span></span>
        </div>
      </div>

      <div className="home-inner">
        <p className="home-label">Transform a Recipe</p>
        <p className="home-sub">Paste a recipe or type any dish name</p>

        <textarea
          className="home-textarea"
          placeholder={"e.g. Chicken Alfredo\n\nor paste a full recipe with ingredients and instructions…"}
          value={recipeInput}
          onChange={e => onRecipeChange(e.target.value)}
          disabled={isLoading}
          rows={5}
        />

        <p className="diet-section-label">
          <span>🎯</span> Select diet preference(s)
        </p>

        <div className="home-diet-grid">
          {DIETS.map(diet => (
            <button
              key={diet.id}
              type="button"
              className={`diet-btn ${selectedDiets.includes(diet.id) ? 'selected' : ''}`}
              onClick={() => onDietToggle(diet.id)}
              disabled={isLoading}
            >
              <span className="diet-icon">{diet.icon}</span>
              <span className="diet-label">{diet.label}</span>
            </button>
          ))}
        </div>

        {activePrefCount > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', marginBottom: 8,
            background: 'var(--amber-pale)', border: '1px solid #FCD34D',
            borderRadius: 10, fontSize: 13, color: 'var(--amber-dark)',
          }}>
            <span>🔒</span>
            <span style={{ fontWeight: 600 }}>
              {activePrefCount} dietary restriction{activePrefCount !== 1 ? 's' : ''} auto-applied
            </span>
          </div>
        )}

        {error && (
          <div className="error-msg mb-12">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Usage indicator */}
        {transformLimit !== undefined && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderRadius: 12, marginBottom: 12,
            background: atLimit ? 'var(--red-bg)' : 'var(--green-pale)',
            border: `1px solid ${atLimit ? '#FFCDD2' : 'var(--green-light)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{atLimit ? '🔒' : '💡'}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: atLimit ? 'var(--red)' : 'var(--green-dark)' }}>
                {atLimit
                  ? isLifetime ? 'Free fixes used up' : 'Monthly limit reached'
                  : isLifetime
                    ? `${swapsLeft} of ${transformLimit} free lifetime fix${swapsLeft !== 1 ? 'es' : ''} remaining`
                    : `${swapsLeft} of ${transformLimit} fix${swapsLeft !== 1 ? 'es' : ''} left this month`
                }
              </span>
            </div>
            <button
              onClick={onUpgrade}
              style={{
                fontSize: 12, fontWeight: 700, color: 'white',
                background: atLimit ? 'var(--red)' : 'var(--green)',
                border: 'none', borderRadius: 10, padding: '4px 10px', cursor: 'pointer',
              }}
            >
              Upgrade
            </button>
          </div>
        )}

        <button
          className="btn btn-primary transform-btn"
          onClick={onTransform}
          disabled={!canTransform}
        >
          {isLoading ? (
            <>
              <div className="spinner" />
              Transforming...
            </>
          ) : (
            <>🔄 Transform My Recipe</>
          )}
        </button>

        {selectedDiets.length === 0 && recipeInput.trim().length > 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6 }}>
            Select at least one diet above to continue
          </p>
        )}
        {atLimit && (
          <p style={{ fontSize: 13, color: 'var(--red)', textAlign: 'center', marginTop: 6 }}>
            {isLifetime ? 'Upgrade to keep transforming recipes →' : 'Upgrade for more fixes →'}{' '}
            <button onClick={onUpgrade} style={{ background: 'none', border: 'none', color: 'var(--red)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>
              View plans
            </button>
          </p>
        )}
      </div>

      {/* Recent swaps */}
      <div className="recent-section">
        <div className="recent-header">
          <span className="recent-title">Recent Swaps</span>
        </div>

        {recent.length === 0 ? (
          <div className="empty-recent">
            <div className="empty-recent-icon">🍽️</div>
            <p>Your transformed recipes will appear here.<br />Try your first swap above!</p>
          </div>
        ) : (
          recent.map(recipe => (
            <div
              key={recipe.id}
              className="recent-card"
              onClick={() => onViewSaved(recipe)}
              role="button"
              tabIndex={0}
            >
              <div className="recent-card-icon">
                {DIET_EMOJI[recipe.diets?.[0]] || '🥗'}
              </div>
              <div className="recent-card-info">
                <div className="recent-card-name">
                  {recipe.transformedRecipe?.name || recipe.originalName || 'Transformed Recipe'}
                </div>
                <div className="recent-card-meta">
                  {recipe.caloriesAfter} cal · {recipe.diets?.slice(0, 2).join(', ')}
                </div>
              </div>
              <span className="recent-card-arrow">›</span>
            </div>
          ))
        )}
      </div>

      <div className="footer-disclaimer" style={{ marginTop: 16 }}>
        <p>Old2New is for informational purposes only. Not medical advice. Consult your physician before changing your diet.</p>
      </div>
    </div>
  )
}
