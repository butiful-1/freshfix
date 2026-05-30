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
}) {
  const canTransform = recipeInput.trim().length > 0 && selectedDiets.length > 0 && !isLoading
  const recent = savedRecipes.slice(0, 3)

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="home-header">
        <div className="header-logo">
          <div className="header-logo-icon">🌿</div>
          <span className="header-logo-text">Fresh<span>Fix</span></span>
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

        {error && (
          <div className="error-msg mb-12">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
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
        <p>FreshFix is for informational purposes only. Not medical advice. Consult your physician before changing your diet.</p>
      </div>
    </div>
  )
}
