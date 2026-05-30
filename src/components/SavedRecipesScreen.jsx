const DIET_EMOJI = {
  'GLP-1 Friendly': '💊', Keto: '🥑', Mediterranean: '🫒',
  'High Protein': '💪', 'Low Sugar': '🍬', 'Low Calorie': '🔥', 'Diabetic Friendly': '❤️'
}

const BG_GRADIENTS = [
  'linear-gradient(135deg, #E8F5E9, #C8E6C9)',
  'linear-gradient(135deg, #F3E5F5, #E1BEE7)',
  'linear-gradient(135deg, #FFF3E0, #FFE0B2)',
  'linear-gradient(135deg, #E3F2FD, #BBDEFB)',
  'linear-gradient(135deg, #FCE4EC, #F8BBD9)',
  'linear-gradient(135deg, #F1F8E9, #DCEDC8)',
]

export default function SavedRecipesScreen({ recipes, onView, onDelete }) {
  if (recipes.length === 0) {
    return (
      <div className="animate-in">
        <div className="screen-header">
          <div className="header-logo">
            <div className="header-logo-icon">🌿</div>
            <span className="header-logo-text">Old<span style={{color:'var(--amber)'}}>2</span><span>New</span></span>
          </div>
        </div>
        <div className="saved-empty">
          <div className="saved-empty-icon">📚</div>
          <h3>No Saved Recipes Yet</h3>
          <p>Transform a recipe and tap "Save Recipe" to see it here.</p>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 240 }}>
            Your saved recipes are stored on this device.
          </div>
        </div>
        <div className="footer-disclaimer">
          <p>Old2New is for informational purposes only. Not medical advice. Consult your physician before changing your diet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in">
      <div className="screen-header">
        <div className="header-logo">
          <div className="header-logo-icon">🌿</div>
          <span className="header-logo-text">Old<span style={{color:'var(--amber)'}}>2</span><span>New</span></span>
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
          {recipes.length} saved
        </span>
      </div>

      <div style={{ padding: '16px 16px 8px' }}>
        <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Saved Recipes
        </p>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
          Tap to view your transformed recipes
        </p>
      </div>

      <div className="saved-grid">
        {recipes.map((recipe, idx) => {
          const name = recipe.transformedRecipe?.name || recipe.originalName || 'Transformed Recipe'
          const primaryDiet = recipe.diets?.[0]
          const emoji = DIET_EMOJI[primaryDiet] || '🥗'
          const bg = BG_GRADIENTS[idx % BG_GRADIENTS.length]

          return (
            <div
              key={recipe.id}
              className="saved-card"
              onClick={() => onView(recipe)}
              role="button"
              tabIndex={0}
            >
              <div className="saved-card-thumb" style={{ background: bg }}>
                <span style={{ fontSize: 38 }}>{emoji}</span>
                <button
                  className="saved-delete"
                  onClick={e => { e.stopPropagation(); onDelete(recipe.id) }}
                  aria-label="Delete recipe"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
              <div className="saved-card-body">
                <div className="saved-card-name">{name}</div>
                <div className="saved-card-cal">
                  {recipe.caloriesAfter} cal · {recipe.transformedRecipe?.servings || '?'} servings
                </div>
                <div className="saved-card-diets">
                  {recipe.diets?.slice(0, 2).map(d => (
                    <span key={d} className="saved-card-diet">{d}</span>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="footer-disclaimer" style={{ marginTop: 8 }}>
        <p>Old2New is for informational purposes only. Not medical advice. Consult your physician before changing your diet.</p>
      </div>
    </div>
  )
}
