import { useState } from 'react'

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

export default function SavedRecipesScreen({ recipes, onView, onDelete, plan }) {
  const [copiedId,    setCopiedId]    = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadErr, setDownloadErr] = useState('')

  const isPaid = plan === 'wellness' || plan === 'family'

  const handleDownload = async () => {
    if (!isPaid || downloading || recipes.length === 0) return
    setDownloading(true)
    setDownloadErr('')
    try {
      const [{ pdf }, { default: CookbookPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./CookbookPDF'),
      ])
      const date = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      const blob = await pdf(<CookbookPDF recipes={recipes} generatedDate={date} />).toBlob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = 'my-old2new-cookbook.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('[Old2New] Cookbook download failed:', e)
      setDownloadErr('Download failed. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const handleShare = async (recipe, e) => {
    e.stopPropagation()
    const url = `https://old2new.app/recipe/${recipe.id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: recipe.transformedRecipe?.name || 'Old2New Recipe', url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopiedId(recipe.id)
        setTimeout(() => setCopiedId(null), 2000)
      }
    } catch {}
  }

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

      {/* Download My Cookbook */}
      <div style={{ padding: '0 16px 16px' }}>
        {isPaid ? (
          <div>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn btn-primary"
              style={{ width: '100%', gap: 8, background: downloading ? 'var(--gray-300)' : undefined }}
            >
              {downloading
                ? <><div className="spinner" /> Generating PDF…</>
                : <>📖 Download My Cookbook</>}
            </button>
            {downloadErr && (
              <p style={{ fontSize: 13, color: 'var(--red, #EF4444)', marginTop: 6, textAlign: 'center' }}>
                {downloadErr}
              </p>
            )}
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--gray-50)', border: '1.5px solid var(--gray-200)',
            borderRadius: 14, padding: '13px 16px',
          }}>
            <span style={{ fontSize: 20 }}>📖</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 1 }}>
                Download My Cookbook
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Plus or Premium plan required
              </p>
            </div>
            <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>🔒</span>
          </div>
        )}
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
                <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button
                    className="saved-delete"
                    onClick={e => { e.stopPropagation(); onDelete(recipe.id) }}
                    aria-label="Delete recipe"
                    title="Delete"
                    style={{ position: 'static' }}
                  >
                    ✕
                  </button>
                  <button
                    onClick={e => handleShare(recipe, e)}
                    aria-label="Copy share link"
                    title={copiedId === recipe.id ? 'Copied!' : 'Copy link'}
                    style={{
                      width: 26, height: 26, borderRadius: 8,
                      background: 'rgba(255,255,255,0.85)', border: 'none',
                      cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--green-dark)',
                    }}
                  >
                    {copiedId === recipe.id ? '✓' : '↑'}
                  </button>
                </div>
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
