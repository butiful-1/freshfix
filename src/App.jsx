import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import SplashScreen from './components/SplashScreen'
import SignUpScreen from './components/SignUpScreen'
import LoginScreen from './components/LoginScreen'
import DisclaimerPopup from './components/DisclaimerPopup'
import OnboardingScreen from './components/OnboardingScreen'
import HomeScreen from './components/HomeScreen'
import ResultsScreen from './components/ResultsScreen'
import ShoppingListScreen from './components/ShoppingListScreen'
import SavedRecipesScreen from './components/SavedRecipesScreen'
import AboutScreen from './components/AboutScreen'
import PricingScreen from './components/PricingScreen'
import UpgradeModal from './components/UpgradeModal'
import PaymentSuccessScreen from './components/PaymentSuccessScreen'
import PaymentCancelScreen from './components/PaymentCancelScreen'
import BottomNav from './components/BottomNav'

const FREE_LIMIT = 5

export default function App() {
  // ── Auth ──────────────────────────────────────
  const [user, setUser]           = useState(null)
  const [profile, setProfile]     = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  // ── Navigation ────────────────────────────────
  const [screen, setScreen]             = useState('splash')
  const [showDisclaimer, setShowDisclaimer] = useState(false)

  // ── Recipe state ──────────────────────────────
  const [recipeInput, setRecipeInput]     = useState('')
  const [selectedDiets, setSelectedDiets] = useState([])
  const [transformResult, setTransformResult] = useState(null)
  const [savedRecipes, setSavedRecipes]   = useState([])
  const [isLoading, setIsLoading]         = useState(false)
  const [error, setError]                 = useState('')

  // ── Subscription ──────────────────────────────
  const [plan, setPlan]                     = useState('free')
  const [swapUsage, setSwapUsage]           = useState({ month: '', count: 0 })
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [stripeSessionId, setStripeSessionId]   = useState(null)

  // ── Load Supabase profile ─────────────────────
  const loadProfile = async (userId, retries = 2) => {
    try {
      const { data } = await supabase
        .from('profiles').select('*').eq('id', userId).single()

      if (!data && retries > 0) {
        await new Promise(r => setTimeout(r, 600))
        return loadProfile(userId, retries - 1)
      }
      if (!data) return

      const currentMonth = new Date().toISOString().slice(0, 7)
      let p = data

      if (data.swaps_month !== currentMonth) {
        const { data: updated } = await supabase
          .from('profiles')
          .update({ swaps_used: 0, swaps_month: currentMonth })
          .eq('id', userId).select().single()
        p = updated || { ...data, swaps_used: 0, swaps_month: currentMonth }
      }

      setProfile(p)
      setPlan(p.plan || 'free')
      setSwapUsage({ month: p.swaps_month, count: p.swaps_used || 0 })
    } catch (e) {
      console.error('loadProfile:', e.message)
    }
  }

  // ── Navigate after sign-in ────────────────────
  const goToApp = () => {
    const agreed    = localStorage.getItem('freshfix_agreed')
    const onboarded = localStorage.getItem('freshfix_onboarded')
    if (!agreed) {
      setShowDisclaimer(true)
      setScreen('onboarding')
    } else {
      setScreen(onboarded ? 'home' : 'onboarding')
    }
  }

  // ── Auth initialization ───────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const path = window.location.pathname

      if (session?.user) {
        setUser(session.user)
        await loadProfile(session.user.id)
        if (path !== '/success' && path !== '/cancel') goToApp()
      }
      setAuthChecked(true)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          await loadProfile(session.user.id)
          if (event === 'SIGNED_IN') goToApp()
        } else {
          setUser(null); setProfile(null)
          setPlan('free'); setSwapUsage({ month: '', count: 0 })
          setScreen('splash')
        }
      }
    )
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Saved recipes ─────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('freshfix_recipes')
      if (saved) setSavedRecipes(JSON.parse(saved))
    } catch {}
  }, [])

  // ── URL routing for Stripe ────────────────────
  useEffect(() => {
    const path   = window.location.pathname
    const params = new URLSearchParams(window.location.search)
    if (path === '/success') { setStripeSessionId(params.get('session_id')); setScreen('success') }
    else if (path === '/cancel') setScreen('cancel')
  }, [])

  // ── Handlers ─────────────────────────────────
  const handleAgreeDisclaimer = () => {
    localStorage.setItem('freshfix_agreed', '1')
    setShowDisclaimer(false)
    setScreen(localStorage.getItem('freshfix_onboarded') ? 'home' : 'onboarding')
  }

  const handleOnboardingComplete = (diets) => {
    localStorage.setItem('freshfix_onboarded', '1')
    if (diets.length > 0) setSelectedDiets(diets)
    setScreen('home')
  }

  const handleDietToggle = (diet) =>
    setSelectedDiets(prev =>
      prev.includes(diet) ? prev.filter(d => d !== diet) : [...prev, diet]
    )

  const handleTransform = async () => {
    if (!recipeInput.trim()) { setError('Please enter a recipe or dish name.'); return }
    if (selectedDiets.length === 0) { setError('Please select at least one diet preference.'); return }

    if (plan === 'free' && swapUsage.count >= FREE_LIMIT) {
      setShowUpgradeModal(true); return
    }

    setIsLoading(true); setError('')

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

      // Increment swap counter in Supabase (free plan only)
      if (plan === 'free') {
        const newCount = swapUsage.count + 1
        setSwapUsage(prev => ({ ...prev, count: newCount }))
        if (user) {
          await supabase.from('profiles').update({ swaps_used: newCount }).eq('id', user.id)
          setProfile(prev => prev ? { ...prev, swaps_used: newCount } : prev)
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveRecipe = () => {
    if (!transformResult) return
    const updated = [{ ...transformResult }, ...savedRecipes.filter(r => r.id !== transformResult.id)]
    setSavedRecipes(updated)
    try { localStorage.setItem('freshfix_recipes', JSON.stringify(updated)) } catch {}
  }

  const handleDeleteSaved = (id) => {
    const updated = savedRecipes.filter(r => r.id !== id)
    setSavedRecipes(updated)
    try { localStorage.setItem('freshfix_recipes', JSON.stringify(updated)) } catch {}
  }

  const handleViewSaved  = (recipe) => { setTransformResult(recipe); setScreen('results') }
  const handleStartOver  = () => { setTransformResult(null); setError(''); setScreen('home') }

  const handlePlanUpdate = async (newPlan) => {
    setPlan(newPlan)
    const resetUsage = { month: new Date().toISOString().slice(0, 7), count: 0 }
    setSwapUsage(resetUsage)
    if (user) {
      await supabase.from('profiles').update({ plan: newPlan, swaps_used: 0 }).eq('id', user.id)
      setProfile(prev => prev ? { ...prev, plan: newPlan, swaps_used: 0 } : prev)
    }
    localStorage.setItem('freshfix_plan', newPlan)
  }

  const handleLogout = () => supabase.auth.signOut()

  // ── Auth loading screen ───────────────────────
  if (!authChecked) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 20, filter: 'drop-shadow(0 6px 16px rgba(34,197,94,0.4))' }}>🌿</div>
          <div className="loading-dots"><span /><span /><span /></div>
        </div>
      </div>
    )
  }

  const showNav = !['splash', 'signup', 'login', 'onboarding', 'success', 'cancel'].includes(screen)

  const renderScreen = () => {
    // Guard: unauthenticated users can only see landing, auth, and payment return screens
    if (!user && !['splash', 'signup', 'login', 'success', 'cancel'].includes(screen)) {
      return <SplashScreen onSignUp={() => setScreen('signup')} onLogin={() => setScreen('login')} />
    }

    switch (screen) {
      case 'splash':
        return <SplashScreen onSignUp={() => setScreen('signup')} onLogin={() => setScreen('login')} />
      case 'signup':
        return <SignUpScreen onLogin={() => setScreen('login')} />
      case 'login':
        return <LoginScreen onSignUp={() => setScreen('signup')} />
      case 'onboarding':
        return <OnboardingScreen onComplete={handleOnboardingComplete} />
      case 'home':
        return (
          <HomeScreen
            recipeInput={recipeInput} onRecipeChange={setRecipeInput}
            selectedDiets={selectedDiets} onDietToggle={handleDietToggle}
            onTransform={handleTransform} isLoading={isLoading} error={error}
            savedRecipes={savedRecipes} onViewSaved={handleViewSaved}
            plan={plan} swapUsage={swapUsage} onUpgrade={() => setScreen('pricing')}
          />
        )
      case 'results':
        return (
          <ResultsScreen
            result={transformResult} onSave={handleSaveRecipe}
            onShoppingList={() => setScreen('shopping')}
            onStartOver={handleStartOver} savedRecipes={savedRecipes}
          />
        )
      case 'shopping':
        return <ShoppingListScreen result={transformResult} onBack={() => setScreen('results')} />
      case 'saved':
        return <SavedRecipesScreen recipes={savedRecipes} onView={handleViewSaved} onDelete={handleDeleteSaved} />
      case 'pricing':
        return <PricingScreen plan={plan} swapUsage={swapUsage} onBack={() => setScreen('home')} />
      case 'about':
        return <AboutScreen user={user} onLogout={handleLogout} />
      case 'success':
        return (
          <PaymentSuccessScreen
            sessionId={stripeSessionId} onPlanUpdate={handlePlanUpdate}
            onContinue={() => { window.history.replaceState({}, '', '/'); setScreen('home') }}
          />
        )
      case 'cancel':
        return (
          <PaymentCancelScreen
            onBack={() => { window.history.replaceState({}, '', '/'); setScreen('pricing') }}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="app">
      {showDisclaimer && <DisclaimerPopup onAgree={handleAgreeDisclaimer} />}

      {showUpgradeModal && (
        <UpgradeModal
          swapUsage={swapUsage}
          onClose={() => setShowUpgradeModal(false)}
          onViewPlans={() => { setShowUpgradeModal(false); setScreen('pricing') }}
        />
      )}

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-overlay-icon">🌿</div>
          <h2>Transforming Recipe…</h2>
          <p>AI is making smart ingredient swaps for your healthy goals</p>
          <div className="loading-dots"><span /><span /><span /></div>
        </div>
      )}

      <div className={`screen ${!showNav ? 'no-nav' : ''}`}>
        {renderScreen()}
      </div>

      {showNav && (
        <BottomNav
          activeScreen={screen} onNavigate={setScreen}
          savedCount={savedRecipes.length} plan={plan} swapUsage={swapUsage}
        />
      )}
    </div>
  )
}
