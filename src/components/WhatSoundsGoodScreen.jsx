import { useState } from 'react'

const MEAL_TYPES = [
  { id: 'Breakfast', emoji: '🌅' },
  { id: 'Lunch',     emoji: '🥗' },
  { id: 'Dinner',    emoji: '🍽️' },
  { id: 'Snack',     emoji: '🍎' },
  { id: 'Dessert',   emoji: '🍰' },
]

const PORK_PROTEINS  = new Set(['Pork'])
const VEGAN_PROTEINS = new Set(['Chicken','Beef','Fish','Shrimp','Pork','Lamb','Turkey','Eggs'])
const ALL_PROTEINS   = ['Chicken','Beef','Fish','Shrimp','Pork','Lamb','Turkey','Tofu','Eggs']
const CUISINES       = ['Italian','Asian','Mexican','Mediterranean','American','Indian','Japanese','Thai','French','Middle Eastern']
const COOKING_TIMES  = ['Under 15 mins','15–30 mins','30–60 mins','1+ hrs']
const DESSERT_TYPES = ['Cookies','Cake','Brownies','Pudding','Pie','Muffins','Bars','Ice Cream','Cheesecake','Fruit Dessert']

const MEAL_TYPE_FILTERS = {
  Breakfast: { proteins: ALL_PROTEINS, cuisineLabel: 'Cuisine', cuisines: CUISINES, cookingTimes: COOKING_TIMES },
  Lunch:     { proteins: ALL_PROTEINS, cuisineLabel: 'Cuisine', cuisines: CUISINES, cookingTimes: COOKING_TIMES },
  Dinner:    { proteins: ALL_PROTEINS, cuisineLabel: 'Cuisine', cuisines: CUISINES, cookingTimes: COOKING_TIMES },
  Snack:     { proteins: [],           cuisineLabel: 'Cuisine', cuisines: CUISINES, cookingTimes: COOKING_TIMES },
  Dessert:   { proteins: [],           cuisineLabel: 'Dessert Type', cuisines: DESSERT_TYPES, cookingTimes: COOKING_TIMES },
}

function getAvailableProteins(dietaryPreferences) {
  return ALL_PROTEINS.filter(p => {
    if (dietaryPreferences?.noPork && PORK_PROTEINS.has(p)) return false
    if (dietaryPreferences?.vegan && VEGAN_PROTEINS.has(p)) return false
    return true
  })
}

function FilterChip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '7px 14px', borderRadius: 20,
        border: `1.5px solid ${selected ? 'var(--green)' : '#E5E7EB'}`,
        background: selected ? 'var(--green-pale)' : 'white',
        color: selected ? 'var(--green-dark)' : 'var(--text-secondary)',
        fontSize: 13, fontWeight: selected ? 700 : 500,
        cursor: 'pointer', fontFamily: 'var(--font)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

function IdeaCard({ idea, onTransform }) {
  return (
    <div style={{
      background: 'white', border: '1px solid #E5E7EB',
      borderRadius: 16, padding: '16px 18px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 36, flexShrink: 0, lineHeight: 1 }}>{idea.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
            {idea.name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>
            {idea.description}
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-muted)' }}>
            {idea.cookingTime && <span>⏱ {idea.cookingTime}</span>}
            {idea.calories    && <span>🔥 ~{idea.calories} cal</span>}
          </div>
        </div>
      </div>
      <button
        className="btn btn-primary"
        onClick={() => onTransform(idea)}
        style={{ width: '100%', fontSize: 14, padding: '11px 20px' }}
      >
        🔄 Transform This Recipe
      </button>
    </div>
  )
}

export default function WhatSoundsGoodScreen({ dietaryPreferences, onSelectIdea, onBack }) {
  const [step,      setStep]      = useState(1)
  const [mealType,  setMealType]  = useState(null)
  const [filters,   setFilters]   = useState({ protein: null, cuisine: null, cookingTime: null })
  const [healthGoal, setHealthGoal] = useState('')
  const [ideas,     setIdeas]     = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState('')

  const availableProteins = getAvailableProteins(dietaryPreferences)

  const toggleFilter = (key, value) =>
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? null : value }))

  // filterOverride lets "Skip filters" pass empty filters without waiting for
  // setFilters to flush — avoids stale-closure bug with batched state updates.
  const handleGenerate = async (filterOverride) => {
    const activeFilters = filterOverride !== undefined ? filterOverride : filters
    setIsLoading(true)
    setError('')
    setIdeas([])
    setStep(3)
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealType, filters: activeFilters, dietaryPreferences, healthGoal }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to get ideas.')
      setIdeas(data.ideas || [])
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectMealType = (id) => {
    setMealType(id)
    setFilters({ protein: null, cuisine: null, cookingTime: null })
    setStep(2)
  }

  const handleBack = () => {
    if (step === 1) onBack()
    else if (step === 2) setStep(1)
    else setStep(2)
  }

  const EMPTY_FILTERS = { protein: null, cuisine: null, cookingTime: null }

  const headerStyle = {
    display: 'flex', alignItems: 'center',
    padding: '16px 20px 12px', borderBottom: '1px solid #F3F4F6',
  }
  const backBtnStyle = {
    background: 'none', border: 'none', fontSize: 22,
    color: 'var(--text-secondary)', cursor: 'pointer',
    padding: '4px 8px 4px 0', fontFamily: 'var(--font)',
    lineHeight: 1, marginRight: 8, flexShrink: 0,
  }
  const sectionLabelStyle = {
    fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
    letterSpacing: '0.06em', textTransform: 'uppercase',
    marginBottom: 10, marginTop: 20,
  }
  const chipRowStyle = { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }

  // ── Step 1: Meal type ─────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="animate-in">
        <div style={headerStyle}>
          <button style={backBtnStyle} onClick={handleBack}>‹</button>
          <div className="header-logo">
            <div className="header-logo-icon">🌿</div>
            <span className="header-logo-text">Old<span style={{ color: 'var(--amber)' }}>2</span>New</span>
          </div>
        </div>
        <div style={{ padding: '28px 20px 20px' }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>
            What sounds good?
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 28, lineHeight: 1.5 }}>
            Pick a meal type and we'll suggest ideas that fit your preferences.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {MEAL_TYPES.map(({ id, emoji }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleSelectMealType(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '18px 20px', borderRadius: 16,
                  border: '1.5px solid #E5E7EB', background: 'white',
                  cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 32 }}>{emoji}</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{id}</span>
                <span style={{ marginLeft: 'auto', fontSize: 18, color: 'var(--text-muted)' }}>›</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Step 2: Filters ───────────────────────────────────────────────────────
  if (step === 2) {
    const categoryFilters = MEAL_TYPE_FILTERS[mealType]
    return (
      <div className="animate-in">
        <div style={headerStyle}>
          <button style={backBtnStyle} onClick={handleBack}>‹</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{mealType} ideas</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Add filters (optional)</div>
          </div>
        </div>

        <div style={{ padding: '20px 20px 120px', overflowY: 'auto' }}>
          {categoryFilters.proteins.length > 0 && availableProteins.length > 0 && (
            <>
              <p style={sectionLabelStyle}>Protein</p>
              <div style={chipRowStyle}>
                {availableProteins.map(p => (
                  <FilterChip key={p} label={p} selected={filters.protein === p}
                    onClick={() => toggleFilter('protein', p)} />
                ))}
              </div>
            </>
          )}

          <p style={sectionLabelStyle}>{categoryFilters.cuisineLabel}</p>
          <div style={chipRowStyle}>
            {categoryFilters.cuisines.map(c => (
              <FilterChip key={c} label={c} selected={filters.cuisine === c}
                onClick={() => toggleFilter('cuisine', c)} />
            ))}
          </div>

          <p style={sectionLabelStyle}>Cooking time</p>
          <div style={chipRowStyle}>
            {COOKING_TIMES.map(t => (
              <FilterChip key={t} label={t} selected={filters.cookingTime === t}
                onClick={() => toggleFilter('cookingTime', t)} />
            ))}
          </div>

          <p style={sectionLabelStyle}>Health Goal or Dietary Preference (Optional)</p>
          <input
            type="text"
            placeholder="e.g. Anti-Inflammatory, Vegan, Vegetarian, Gluten-Free, Heart Healthy"
            value={healthGoal}
            onChange={e => setHealthGoal(e.target.value)}
          />

        </div>

        <div style={{
          position: 'fixed', bottom: 64, left: 0, right: 0,
          padding: '12px 20px 8px', background: 'white', borderTop: '1px solid #F3F4F6',
        }}>
          <button className="btn btn-primary" onClick={() => handleGenerate()} style={{ width: '100%' }}>
            ✨ Show Me Ideas
          </button>
          <button
            type="button"
            onClick={() => handleGenerate(EMPTY_FILTERS)}
            style={{
              display: 'block', width: '100%', marginTop: 8,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: 'var(--text-muted)',
              fontFamily: 'var(--font)', padding: '4px 0', textAlign: 'center',
            }}
          >
            Skip filters →
          </button>
        </div>
      </div>
    )
  }

  // ── Step 3: Results ───────────────────────────────────────────────────────
  return (
    <div className="animate-in">
      <div style={headerStyle}>
        <button style={backBtnStyle} onClick={handleBack}>‹</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{mealType} ideas</div>
          {!isLoading && ideas.length > 0 && ideas.length < 5 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {ideas.length} of 5 matched your restrictions
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 20px 24px' }}>

        {/* Loading */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16, filter: 'drop-shadow(0 4px 12px rgba(34,197,94,0.35))' }}>🌿</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Finding ideas…
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
              Checking against your dietary restrictions
            </p>
            <div className="loading-dots"><span /><span /><span /></div>
          </div>
        )}

        {/* API error */}
        {!isLoading && error && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>😕</div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
              Something went wrong
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>{error}</p>
            <button className="btn btn-primary" onClick={() => handleGenerate()} style={{ width: '100%', marginBottom: 10 }}>
              Try Again
            </button>
            <button
              type="button" onClick={() => setStep(2)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font)',
              }}
            >
              ← Change Filters
            </button>
          </div>
        )}

        {/* Zero clean ideas — every suggestion conflicted with dietary restrictions */}
        {!isLoading && !error && ideas.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🤔</div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
              No matching ideas found
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
              Every suggestion conflicted with your dietary restrictions after two attempts.
              Try a different meal type or broader filters.
            </p>
            <button className="btn btn-primary" onClick={() => handleGenerate()} style={{ width: '100%', marginBottom: 10 }}>
              Try Again
            </button>
            <button
              type="button" onClick={() => setStep(2)}
              style={{
                display: 'block', width: '100%', marginTop: 4,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: 'var(--text-muted)',
                fontFamily: 'var(--font)', padding: '8px 0',
              }}
            >
              ← Change Filters
            </button>
          </div>
        )}

        {/* Partial results banner — shown when 1–4 ideas survived the safety gate */}
        {!isLoading && !error && ideas.length > 0 && ideas.length < 5 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', marginBottom: 16,
            background: 'var(--amber-pale)', border: '1px solid #FCD34D',
            borderRadius: 10, fontSize: 13, color: 'var(--amber-dark)',
          }}>
            <span>ℹ️</span>
            <span style={{ fontWeight: 600 }}>
              {ideas.length} idea{ideas.length !== 1 ? 's' : ''} matched — some were filtered for your dietary restrictions.
            </span>
          </div>
        )}

        {/* Idea cards */}
        {!isLoading && !error && ideas.map((idea, i) => (
          <IdeaCard key={i} idea={idea} onTransform={onSelectIdea} />
        ))}

        {/* Regenerate link shown below cards when results are present */}
        {!isLoading && !error && ideas.length > 0 && (
          <button
            type="button" onClick={() => handleGenerate()}
            style={{
              display: 'block', width: '100%', marginTop: 8,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: 'var(--text-muted)',
              fontFamily: 'var(--font)', padding: '8px 0', textAlign: 'center',
            }}
          >
            🔁 Show Me More
          </button>
        )}
      </div>
    </div>
  )
}
