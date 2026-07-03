const FREE_LIMIT = 5

const NAV_ITEMS = [
  { id: 'home',    label: 'Home',    icon: '🏠', activeIcon: '🏡' },
  { id: 'saved',   label: 'Saved',   icon: '🔖', activeIcon: '🔖' },
  { id: 'pricing', label: 'Pricing', icon: '⭐', activeIcon: '⭐' },
  { id: 'about',   label: 'About',   icon: 'ℹ️', activeIcon: 'ℹ️' },
]

export default function BottomNav({ activeScreen, onNavigate, savedCount, plan, swapUsage, isTWA }) {
  const activeBase = ['results', 'shopping'].includes(activeScreen) ? 'home' : activeScreen
  const swapsLeft = Math.max(0, FREE_LIMIT - (swapUsage?.count || 0))
  const atLimit = plan === 'free' && swapsLeft === 0
  const visibleItems = isTWA ? NAV_ITEMS.filter(i => i.id !== 'pricing') : NAV_ITEMS

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {visibleItems.map(item => {
        const isActive = activeBase === item.id
        return (
          <button
            key={item.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className="nav-icon">
              <span style={{ fontSize: 22, filter: isActive ? 'none' : 'grayscale(60%)' }}>
                {isActive ? item.activeIcon : item.icon}
              </span>
              {item.id === 'saved' && savedCount > 0 && (
                <span className="nav-badge">{savedCount > 9 ? '9+' : savedCount}</span>
              )}
              {item.id === 'pricing' && atLimit && (
                <span className="nav-badge" style={{ background: 'var(--orange)' }}>!</span>
              )}
              {isActive && <div className="nav-active-dot" />}
            </div>
            <span className="nav-label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
