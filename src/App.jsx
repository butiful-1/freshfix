import { useState, useEffect } from 'react'
import SplashScreen from './components/SplashScreen'
import DisclaimerPopup from './components/DisclaimerPopup'
import OnboardingScreen from './components/OnboardingScreen'
import HomeScreen from './components/HomeScreen'
import ResultsScreen from './components/ResultsScreen'
import ShoppingListScreen from './components/ShoppingListScreen'
import SavedRecipesScreen from './components/SavedRecipesScreen'
import AboutScreen from './components/AboutScreen'
import BottomNav from './components/BottomNav'

export default function App() {
  const [screen, setScreen] = useState('splash')
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [recipeInput, setRecipeInput] = useState('')
  const [selectedDiets, setSelectedDiets] = useState([])
  const [transformResult, setTransformResult] = useState(null)
  const [savedRecipes, setSavedRecipes] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('freshfix_recipes')
      if (saved) setSavedRecipes(JSON.parse(saved))
    } catch {}
  }, [])

  const handleGetStarted = () => {
    const agreed = localStorage.getItem('freshfix_agreed')
    if (!agreed) {
      setShowDisclaimer(true)
    } else {
      const onboarded = localStorage.getItem('freshfix_onboarded')
      setScreen(onboarded ? 'home' : 'onboarding')
    }
  }

  const handleAgreeDisclaimer = () => {
    localStorage.setItem('freshfix_agreed', '1')
    setShowDisclaimer(false)
    const onboarded = localStorage.getItem('freshfix_onboarded')
    setScreen(onboarded ? 'home' : 'onboarding')
  }

  const handleOnboardingComplete = (diets) => {
    localStorage.setItem('freshfix_onboarded', '1')
    if (diets.length > 0) setSelectedDiets(diets)
    setScreen('home')
  }

  const handleDietToggle = (diet) => {
    setSelectedDiets(prev =>
      prev.includes(diet) ? prev.filter(d => d !== diet) : [...prev, diet]
    )
  }

  const handleTransform = async () => {
    if (!recipeInput.trim()) {
      setError('Please enter a recipe or dish name.')
      return
    }
    if (selectedDiets.length === 0) {
      setError('Please select at least one diet preference.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe: recipeInput, diets: selectedDiets }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to transform recipe.')

      const result = { ...data, originalRecipe: recipeInput, diets: selectedDiets, id: Date.now() }
      setTransformResult(result)
      setScreen('results')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveRecipe = () => {
    if (!transformResult) return
    const updated = [
      { ...transformResult },
      ...savedRecipes.filter(r => r.id !== transformResult.id),
    ]
    setSavedRecipes(updated)
    try { localStorage.setItem('freshfix_recipes', JSON.stringify(updated)) } catch {}
  }

  const handleDeleteSaved = (id) => {
    const updated = savedRecipes.filter(r => r.id !== id)
    setSavedRecipes(updated)
    try { localStorage.setItem('freshfix_recipes', JSON.stringify(updated)) } catch {}
  }

  const handleViewSaved = (recipe) => {
    setTransformResult(recipe)
    setScreen('results')
  }

  const handleStartOver = () => {
    setTransformResult(null)
    setError('')
    setScreen('home')
  }

  const showNav = !['splash', 'onboarding'].includes(screen)

  const renderScreen = () => {
    switch (screen) {
      case 'splash':
        return <SplashScreen onGetStarted={handleGetStarted} />

      case 'onboarding':
        return <OnboardingScreen onComplete={handleOnboardingComplete} />

      case 'home':
        return (
          <HomeScreen
            recipeInput={recipeInput}
            onRecipeChange={setRecipeInput}
            selectedDiets={selectedDiets}
            onDietToggle={handleDietToggle}
            onTransform={handleTransform}
            isLoading={isLoading}
            error={error}
            savedRecipes={savedRecipes}
            onViewSaved={handleViewSaved}
          />
        )

      case 'results':
        return (
          <ResultsScreen
            result={transformResult}
            onSave={handleSaveRecipe}
            onShoppingList={() => setScreen('shopping')}
            onStartOver={handleStartOver}
            savedRecipes={savedRecipes}
          />
        )

      case 'shopping':
        return (
          <ShoppingListScreen
            result={transformResult}
            onBack={() => setScreen('results')}
          />
        )

      case 'saved':
        return (
          <SavedRecipesScreen
            recipes={savedRecipes}
            onView={handleViewSaved}
            onDelete={handleDeleteSaved}
          />
        )

      case 'about':
        return <AboutScreen />

      default:
        return null
    }
  }

  return (
    <div className="app">
      {showDisclaimer && <DisclaimerPopup onAgree={handleAgreeDisclaimer} />}

      {/* Loading overlay during transform */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-overlay-icon">🌿</div>
          <h2>Transforming Recipe…</h2>
          <p>AI is making smart ingredient swaps for your healthy goals</p>
          <div className="loading-dots">
            <span /><span /><span />
          </div>
        </div>
      )}

      <div className={`screen ${!showNav ? 'no-nav' : ''}`}>
        {renderScreen()}
      </div>

      {showNav && (
        <BottomNav
          activeScreen={screen}
          onNavigate={setScreen}
          savedCount={savedRecipes.length}
        />
      )}
    </div>
  )
}
