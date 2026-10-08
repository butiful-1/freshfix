import SourcesLink from './shared/SourcesLink.jsx'
import { HEALTH_GOALS, topicsForGoals } from '../data/healthGoals.js'
import { SHORT_DISCLAIMER } from '../healthDisclaimer.js'

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
  dietaryPreferences, onWhatSoundsGood, isTWA, showUpgrade,
  healthGoal, onHealthGoalChange, onViewReferences,
}) {
  // Upgrade controls: web always; iOS native via Apple IAP (showUpgrade);
  // Android TWA never (no Play Billing).
  const canUpgrade = showUpgrade ?? !isTWA
  const canTransform = recipeInput.trim().length > 0 && (selectedDiets.length > 0 || healthGoal.trim().length > 0) && !isLoading
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <p className="diet-section-label" style={{ margin: 0 }}>
            <span>🎯</span> How would you like to transform your recipe?
          </p>
          <SourcesLink
            compact
            label="What these mean"
            title="Transformation goals"
            topics={topicsForGoals(selectedDiets.length ? selectedDiets : HEALTH_GOALS.map(g => g.id))}
            intro={(selectedDiets.length ? HEALTH_GOALS.filter(g => selectedDiets.includes(g.id)) : HEALTH_GOALS).map(g => `${g.icon} ${g.id}: ${g.definition}`).join('\n\n')}
            onViewAll={onViewReferences}
            style={{ whiteSpace: 'nowrap' }}
          />
        </div>

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

        <label className="diet-section-label" htmlFor="health-goal-input">
          Health Goal or Dietary Preference (Optional)
        </label>
        <input
          id="health-goal-input"
          type="text"
          placeholder="e.g. Anti-Inflammatory, Vegan, Vegetarian, Gluten-Free, Heart Healthy"
          value={healthGoal}
          onChange={e => onHealthGoalChange(e.target.value)}
          disabled={isLoading}
          style={{ marginBottom: 12 }}
        />

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
                  ? `0 of ${transformLimit} Recipe Upgrades Remaining This Month`
                  : `${swapsLeft} of ${transformLimit} Recipe Upgrade${swapsLeft !== 1 ? 's' : ''} Remaining This Month`
                }
              </span>
            </div>
            {canUpgrade && (
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
            )}
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

        {selectedDiets.length === 0 && healthGoal.trim().length === 0 && recipeInput.trim().length > 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6 }}>
            Select a preference above or enter one below to continue
          </p>
        )}
        {atLimit && canUpgrade && (
          <p style={{ fontSize: 13, color: 'var(--red)', textAlign: 'center', marginTop: 6 }}>
            {'Upgrade for more Recipe Upgrades →'}{' '}
            <button onClick={onUpgrade} style={{ background: 'none', border: 'none', color: 'var(--red)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>
              View plans
            </button>
          </p>
        )}
      </div>

      <div style={{ padding: '0 20px', marginBottom: 4 }}>
        <button
          type="button"
          onClick={onWhatSoundsGood}
          disabled={isLoading}
          style={{
            width: '100%', padding: '13px 20px', borderRadius: 14,
            border: '1.5px solid var(--green)', background: 'var(--green-pale)',
            color: 'var(--green-dark)', fontSize: 15, fontWeight: 700,
            cursor: isLoading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)',
          }}
        >
          ✨ What Sounds Good?
        </button>
      </div>

      {/* Recent swaps */}
      <div className="recent-section">
        <div className="recent-header">
          <span className="recent-title">Recent Recipe Upgrades</span>
        </div>

        {recent.length === 0 ? (
          <div className="empty-recent">
            <div className="empty-recent-icon">🍽️</div>
            <p>Your transformed recipes will appear here.<br />Try your first Recipe Upgrade above!</p>
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
        <p>{SHORT_DISCLAIMER}{' '}
          {onViewReferences && <button type="button" onClick={onViewReferences} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--green-dark)', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font)' }}>Sources &amp; References</button>}
        </p>
      </div>
    </div>
  )
}
