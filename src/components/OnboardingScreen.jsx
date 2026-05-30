import { useState } from 'react'

const DIETS = [
  { id: 'GLP-1 Friendly', label: 'GLP-1 Friendly', icon: '💊' },
  { id: 'Keto', label: 'Keto', icon: '🥑' },
  { id: 'Mediterranean', label: 'Mediterranean', icon: '🫒' },
  { id: 'High Protein', label: 'High Protein', icon: '💪' },
  { id: 'Low Sugar', label: 'Low Sugar', icon: '🍬' },
  { id: 'Low Calorie', label: 'Low Calorie', icon: '🔥' },
  { id: 'Diabetic Friendly', label: 'Diabetic Friendly', icon: '❤️' },
]

export default function OnboardingScreen({ onComplete }) {
  const [selected, setSelected] = useState([])

  const toggle = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])

  return (
    <div className="onboarding screen no-nav animate-in">
      <p className="onboarding-step">Step 1 of 1</p>
      <h1 className="onboarding-title">What's your health goal?</h1>
      <p className="onboarding-sub">
        Choose your diet preferences so Old2New can fix recipes your way. You can always change this later.
      </p>

      <div className="onboarding-grid">
        {DIETS.map(diet => (
          <button
            key={diet.id}
            className={`diet-btn ${selected.includes(diet.id) ? 'selected' : ''}`}
            onClick={() => toggle(diet.id)}
            type="button"
          >
            <span className="diet-icon">{diet.icon}</span>
            <span className="diet-label">{diet.label}</span>
          </button>
        ))}
      </div>

      <button
        className="btn btn-primary mt-16"
        onClick={() => onComplete(selected)}
      >
        {selected.length > 0 ? `Let's Go! (${selected.length} selected)` : 'Skip for Now'}
      </button>

      <div className="onboarding-skip">
        <button type="button" onClick={() => onComplete([])}>
          Skip this step
        </button>
      </div>
    </div>
  )
}
