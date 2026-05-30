import { useState } from 'react'

const CATEGORY_ICONS = {
  produce: '🥦',
  protein: '🍗',
  dairy: '🧀',
  pantry: '🫙',
  other: '🛒',
}

const CATEGORY_LABELS = {
  produce: 'Produce',
  protein: 'Protein',
  dairy: 'Dairy',
  pantry: 'Pantry & Dry Goods',
  other: 'Other',
}

export default function ShoppingListScreen({ result, onBack }) {
  const [checked, setChecked] = useState({})
  const [copied, setCopied] = useState(false)

  if (!result?.shoppingList) return null

  const { shoppingList, transformedRecipe } = result
  const categories = Object.entries(shoppingList).filter(([, items]) => items?.length > 0)

  const toggleItem = (key) =>
    setChecked(prev => ({ ...prev, [key]: !prev[key] }))

  const totalItems = categories.reduce((sum, [, items]) => sum + items.length, 0)
  const checkedCount = Object.values(checked).filter(Boolean).length

  const handlePrint = () => window.print()

  const handleCopy = async () => {
    const lines = [`🛒 Shopping List — ${transformedRecipe?.name || 'Old2New Recipe'}\n`]
    categories.forEach(([cat, items]) => {
      lines.push(`${CATEGORY_LABELS[cat] || cat}:`)
      items.forEach(item => lines.push(`  • ${item}`))
      lines.push('')
    })
    lines.push('Made with Old2New · Not medical advice.')
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    const lines = [`🛒 ${transformedRecipe?.name || 'Old2New Recipe'} — Shopping List\n`]
    categories.forEach(([cat, items]) => {
      lines.push(`${CATEGORY_LABELS[cat] || cat}: ${items.join(', ')}`)
    })
    const text = lines.join('\n')
    if (navigator.share) {
      try { await navigator.share({ title: 'Shopping List', text }) } catch {}
    } else {
      handleCopy()
    }
  }

  return (
    <div className="animate-in">
      <div className="screen-header">
        <button className="back-btn" onClick={onBack} aria-label="Back to results">←</button>
        <h1>Shopping List</h1>
        <button className="btn-icon btn" onClick={handleShare} style={{ background: 'transparent', fontSize: 18 }} title="Share">
          ↑
        </button>
      </div>

      {/* Progress */}
      <div style={{ padding: '12px 16px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {transformedRecipe?.name || 'Shopping List'}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {checkedCount}/{totalItems} items
          </span>
        </div>
        <div style={{ height: 6, background: 'var(--gray-200)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: 'var(--green)', borderRadius: 3,
            width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Categories */}
      {categories.map(([category, items]) => (
        <div key={category} className="category-section">
          <div className="category-title">
            <span>{CATEGORY_ICONS[category] || '🛒'}</span>
            {CATEGORY_LABELS[category] || category}
            <span style={{ marginLeft: 'auto', fontWeight: 400, letterSpacing: 0 }}>{items.length} items</span>
          </div>
          <div className="card">
            {items.map((item, i) => {
              const key = `${category}-${i}`
              const done = !!checked[key]
              return (
                <div
                  key={key}
                  className={`shopping-item ${done ? 'done' : ''}`}
                  onClick={() => toggleItem(key)}
                  role="checkbox"
                  aria-checked={done}
                  tabIndex={0}
                  onKeyDown={e => e.key === ' ' && toggleItem(key)}
                >
                  <div className={`checkbox-circle ${done ? 'checked' : ''}`}>
                    {done && <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>✓</span>}
                  </div>
                  <span className="shopping-text">{item}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Actions */}
      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="btn-row">
          <button className="btn btn-secondary" onClick={handleCopy}>
            {copied ? '✓ Copied!' : '📋 Copy List'}
          </button>
          <button className="btn btn-secondary" onClick={handlePrint}>
            🖨️ Print
          </button>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => setChecked({})}
          disabled={checkedCount === 0}
        >
          Clear All Checks
        </button>
      </div>

      <div className="footer-disclaimer">
        <p>Old2New is for informational purposes only. Not medical advice. Consult your physician before changing your diet.</p>
      </div>
    </div>
  )
}
