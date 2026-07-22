// Extracted from ResultsScreen.jsx so the public recipe-transformation pages
// can reuse the exact same macro-comparison visual treatment as the app's
// real results screen, without duplicating the markup. Presentational only
// — no behavior change from the original inline version.
export const MACRO_COLORS = {
  protein: '#22C55E',
  carbs: '#FF9800',
  fat: '#2196F3',
  fiber: '#9C27B0',
}

export function MacroBar({ label, before, after, color }) {
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
