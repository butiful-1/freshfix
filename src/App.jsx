import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

// Races a promise against a ms timeout; on timeout resolves with `fallback`
// instead of rejecting so callers can proceed gracefully without re-throwing.
const withTimeout = (promise, ms, fallback) =>
  Promise.race([promise, new Promise(r => setTimeout(() => r(fallback), ms))])
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
import RecipeShareScreen from './components/RecipeShareScreen'
import BottomNav from './components/BottomNav'
import WhatSoundsGoodScreen from './components/WhatSoundsGoodScreen'
import ResetPasswordScreen from './components/ResetPasswordScreen'

const PLAN_LIMITS = { free: 5, wellness: 50, family: 150 }

export default function App() {
  // ── Auth ──────────────────────────────────────
  const [user, setUser]           = useState(null)
  const [profile, setProfile]     = useState(null)
  const [authChecked, setAuthChecked] = useState(() => {
    const p = window.location.pathname
    return p === '/auth/callback' || p.startsWith('/recipe/') || (p === '/' && !!new URLSearchParams(window.location.search).get('code'))
  })

  // ── Navigation ────────────────────────────────
  const [screen, setScreen] = useState(() => {
    const p = window.location.pathname
    if (p === '/auth/callback') return 'callback'
    if (p === '/' && new URLSearchParams(window.location.search).get('code')) return 'callback'
    if (p.startsWith('/recipe/')) return 'recipe-share'
    if (p === '/success') return 'success'
    if (p === '/cancel') return 'cancel'
    return 'splash'
  })
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [callbackStatus, setCallbackStatus] = useState('loading') // 'loading' | 'success' | 'error'
  const [callbackError,  setCallbackError]  = useState('')
  const [callbackType, setCallbackType] = useState(() => {
    const p = window.location.pathname
    const s = new URLSearchParams(window.location.search)
    if (p === '/auth/callback') {
      if (s.get('type') === 'recovery') return 'recovery'
      if (s.get('code') || window.location.hash.includes('access_token')) return 'oauth'
    }
    if (p === '/' && s.get('code')) return 'oauth'
    return null
  })                                                              // null | 'recovery' | 'oauth'
  const inCallbackRef = useRef(false)
  const appInitializedRef = useRef(false)
  const abortControllerRef = useRef(null)
  const tryAgainTimerRef = useRef(null)
  const transformGenerationRef = useRef(0)
  const isTimeoutRef = useRef(false)

  // ── Recipe state ──────────────────────────────
  const [recipeInput, setRecipeInput]     = useState('')
  const [selectedDiets, setSelectedDiets] = useState([])
  const [transformResult, setTransformResult] = useState(null)
  const [savedRecipes, setSavedRecipes]   = useState([])
  const [isLoading, setIsLoading]         = useState(false)
  const [showTryAgain, setShowTryAgain]   = useState(false)
  const [error, setError]                 = useState('')

  // ── Subscription ──────────────────────────────
  const [plan, setPlan]                     = useState('free')
  const [swapUsage, setSwapUsage]           = useState({ month: '', count: 0 })
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [stripeSessionId, setStripeSessionId]   = useState(null)
  const [sharedRecipeId, setSharedRecipeId]     = useState(null)

  // ── TWA (Android app) detection ───────────────
  // Persisted to sessionStorage so in-app navigation doesn't lose it.
  const [isTWA] = useState(() => {
    if (new URLSearchParams(window.location.search).get('src') === 'twa') {
      sessionStorage.setItem('twa', '1')
      return true
    }
    return sessionStorage.getItem('twa') === '1'
  })

  // ── Dietary preferences ───────────────────────
  const [dietaryPreferences, setDietaryPreferences] = useState({})
  const [showLoadingRecovery, setShowLoadingRecovery] = useState(false)

  // ── 15-second "Try Again" timer ───────────────
  useEffect(() => {
    if (isLoading) {
      tryAgainTimerRef.current = setTimeout(() => setShowTryAgain(true), 15000)
    } else {
      clearTimeout(tryAgainTimerRef.current)
      setShowTryAgain(false)
    }
    return () => clearTimeout(tryAgainTimerRef.current)
  }, [isLoading])

  // ── Auth loading safety net ───────────────────
  // On Android TWA, supabase.auth.getSession() can hang indefinitely when the
  // cached session token needs a network refresh on a poor connection. After 5s
  // show a recovery button; after 10s auto-advance so the user is never trapped.
  useEffect(() => {
    if (authChecked) { setShowLoadingRecovery(false); return }
    const recoveryTimer = setTimeout(() => setShowLoadingRecovery(true), 5000)
    const autoAdvance   = setTimeout(() => setAuthChecked(true), 10000)
    return () => { clearTimeout(recoveryTimer); clearTimeout(autoAdvance) }
  }, [authChecked])

  // ── isLoading safety net ──────────────────────
  // If the transform overlay somehow gets stuck (e.g. Supabase update hangs
  // after setScreen on a poor Android connection), force-reset after 45s.
  useEffect(() => {
    if (!isLoading) return
    const safety = setTimeout(() => {
      setIsLoading(false)
      setError('Something went wrong. Please try again.')
    }, 45000)
    return () => clearTimeout(safety)
  }, [isLoading])

  // ── TWA visibility safety net ─────────────────
  // When Android backgrounds then restores the TWA, React state is preserved.
  // If we were mid-auth-check, advance past the spinner on resume.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !authChecked) setAuthChecked(true)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [authChecked])

  // ── Load Supabase profile ─────────────────────
  const loadProfile = async (userId, retries = 2) => {
    try {
      const { data } = await withTimeout(
        supabase.from('profiles').select('*').eq('id', userId).single(),
        5000, { data: null }
      )

      if (!data && retries > 0) {
        await new Promise(r => setTimeout(r, 600))
        return loadProfile(userId, retries - 1)
      }
      if (!data) return

      const currentMonth = new Date().toISOString().slice(0, 7)
      let p = data

      if (data.swaps_month !== currentMonth) {
        const { data: updated } = await withTimeout(
          supabase.from('profiles')
            .update({ swaps_used: 0, swaps_month: currentMonth })
            .eq('id', userId).select().single(),
          5000, { data: null }
        )
        p = updated || { ...data, swaps_used: 0, swaps_month: currentMonth }
      }

      setProfile(p)
      setPlan(p.plan || 'free')
      setSwapUsage({ month: p.swaps_month, count: p.swaps_used || 0 })
      setDietaryPreferences(p.dietary_preferences || {})
    } catch (e) {
      console.error('loadProfile:', e.message)
    }
  }

  // ── Load saved recipes from Supabase ─────────
  const loadSavedRecipes = async (userId) => {
    try {
      const { data, error } = await withTimeout(
        supabase.from('saved_recipes')
          .select('id, recipe_data')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        5000, { data: null, error: null }
      )
      if (error) throw error
      if (data) setSavedRecipes(data.map(row => ({ ...row.recipe_data, id: row.id })))
    } catch (e) {
      console.error('loadSavedRecipes:', e.message)
    }
  }

  // ── Navigate after sign-in ────────────────────
  const goToApp = () => {
    const agreed    = localStorage.getItem('old2new_agreed')
    const onboarded = localStorage.getItem('old2new_onboarded')
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
      const path = window.location.pathname

      // Callback, recipe-share, and root-with-OAuth-code paths set authChecked=true via
      // useState initializer; getSession() must not run — the URL routing effect owns those.
      // skipAutoInitialize:true on the Supabase client prevents _recoverAndRefresh() from
      // running automatically and blocking exchangeCodeForSession on callback paths.
      if (path === '/auth/callback' || path.startsWith('/recipe/') || (path === '/' && new URLSearchParams(window.location.search).get('code'))) return

      try {
        // Manually initialize here (non-callback paths only) so _recoverAndRefresh()
        // loads the returning user's session from localStorage before getSession() reads it.
        await supabase.auth.initialize()
        // 6s timeout — on Android TWA a stale cached token triggers a network
        // refresh that can hang indefinitely on a poor connection.
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          6000, { data: { session: null } }
        )
        if (session?.user) {
          setUser(session.user)
          await loadProfile(session.user.id)
          loadSavedRecipes(session.user.id)
          if (path !== '/success' && path !== '/cancel') {
            if (localStorage.getItem('old2new_pending_reset')) {
              localStorage.removeItem('old2new_pending_reset')
              setScreen('reset-password')
            } else {
              goToApp()
            }
            appInitializedRef.current = true
          }
        }
      } catch (e) {
        console.error('[Old2New] Auth init error:', e.message)
      } finally {
        setAuthChecked(true)
      }
    }
    init()

    // Cross-tab auth sync — fires when the callback tab writes supabase-auth-complete.
    // No appInitializedRef guard: this listener must always respond to cross-tab auth
    // events regardless of the current tab's initialization state.
    const handleCrossTabAuth = async (e) => {
      if (e.key !== 'supabase-auth-complete') return
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          await loadProfile(session.user.id)
          loadSavedRecipes(session.user.id)
          appInitializedRef.current = true
          if (!window.location.pathname.startsWith('/recipe/')) {
            goToApp()
          }
        }
      } catch (err) {
        console.error('[Old2New] Cross-tab auth sync error:', err.message)
      }
    }
    window.addEventListener('storage', handleCrossTabAuth)

    let subscription = null
    try {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          try {
            if (session?.user) {
              setUser(session.user)
              await loadProfile(session.user.id)
              if (event === 'PASSWORD_RECOVERY') {
                inCallbackRef.current = false
                appInitializedRef.current = true
                setScreen('reset-password')
              } else if (event === 'SIGNED_IN' && inCallbackRef.current) {
                appInitializedRef.current = true
              } else if (event === 'SIGNED_IN' && !appInitializedRef.current) {
                loadSavedRecipes(session.user.id)
                if (!window.location.pathname.startsWith('/recipe/')) {
                  goToApp()
                }
                appInitializedRef.current = true
              }
            } else {
              setUser(null); setProfile(null)
              setPlan('free'); setSwapUsage({ month: '', count: 0 })
              setDietaryPreferences({})
              setSavedRecipes([])
              appInitializedRef.current = false
              if (!window.location.pathname.startsWith('/recipe/')) {
                setScreen('splash')
              }
            }
          } catch (e) {
            console.error('[Old2New] Auth state change error:', e.message)
          }
        }
      )
      subscription = data.subscription
    } catch (e) {
      console.error('[Old2New] Auth listener error:', e.message)
      setAuthChecked(true)
    }

    return () => {
      subscription?.unsubscribe()
      window.removeEventListener('storage', handleCrossTabAuth)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── URL routing ──────────────────────────────
  useEffect(() => {
    const path   = window.location.pathname
    const params = new URLSearchParams(window.location.search)

    if (path === '/auth/callback') {
      setScreen('callback')
      inCallbackRef.current = true
      console.log('[Old2New] OAuth Path Used: CALLBACK')

      // Capture the full URL BEFORE replaceState wipes it, then clear immediately
      const url        = new URL(window.location.href)
      const code       = url.searchParams.get('code')
      const token_hash = url.searchParams.get('token_hash')
      const hash       = window.location.hash
      const hashParams = hash ? new URLSearchParams(hash.replace(/^#/, '')) : null
      const type       = url.searchParams.get('type') || hashParams?.get('type') || 'signup'
      const errorParam = url.searchParams.get('error')
      if (type === 'recovery') setCallbackType('recovery')
      else if (code || (hash && hash.includes('access_token'))) setCallbackType('oauth')

      console.log('[Old2New] Auth callback received:', {
        hasCode: !!code,
        hasTokenHash: !!token_hash,
        type,
        hasHashToken: hash.includes('access_token'),
        errorParam,
      })

      window.history.replaceState({}, '', '/');

      (async () => {
        try {
          let session = null

          if (errorParam) {
            throw new Error(url.searchParams.get('error_description') || errorParam)
          } else if (code) {
            console.log('[Old2New] PKCE code flow')
            const { data, error } = await supabase.auth.exchangeCodeForSession(code)
            if (error) throw error
            session = data.session
          } else if (token_hash) {
            console.log('[Old2New] OTP token_hash flow, type:', type)
            const { data, error } = await supabase.auth.verifyOtp({ token_hash, type })
            if (error) throw error
            session = data.session
          } else if (hash && hash.includes('access_token')) {
            console.log('[Old2New] Implicit hash flow')
            const hp = new URLSearchParams(hash.replace(/^#/, ''))
            const at = hp.get('access_token')
            const rt = hp.get('refresh_token')
            if (at && rt) {
              const { data: sd, error: se } = await supabase.auth.setSession({ access_token: at, refresh_token: rt })
              if (se) throw se
              session = sd?.session
            } else {
              const { data } = await supabase.auth.getSession()
              session = data?.session
            }
          } else {
            throw new Error('No valid auth parameters found in the confirmation URL.')
          }

          if (type === 'recovery') {
            localStorage.setItem('old2new_pending_reset', '1')
            console.log('[Old2New] Recovery verified, session?.user:', !!session?.user)
            // If the branch above didn't establish a session via setSession,
            // try again with whatever tokens verifyOtp returned.
            if (!session?.user && session?.access_token && session?.refresh_token) {
              const { data: sd2 } = await supabase.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
              })
              session = sd2?.session ?? session
            }
            const { data: check } = await supabase.auth.getSession()
            console.log('[Old2New] Recovery getSession check, user:', check?.session?.user?.email ?? null)
            if (!check?.session) {
              throw new Error('Recovery session could not be established. Please request a new reset link.')
            }
            appInitializedRef.current = true
            inCallbackRef.current = false
            setScreen('reset-password')
          } else if (session?.user) {
            console.log('[Old2New] Session established — navigating to app')
            localStorage.setItem('supabase-auth-complete', Date.now().toString())
            setUser(session.user)
            loadProfile(session.user.id)
            loadSavedRecipes(session.user.id)
            appInitializedRef.current = true
            inCallbackRef.current = false
            if (code || (hash && hash.includes('access_token'))) {
              goToApp()
            } else {
              setCallbackStatus('success')
              setTimeout(() => goToApp(), 400)
            }
          } else {
            console.warn('[Old2New] Exchange succeeded but no session — redirecting to login')
            window.location.replace('/?login=verified')
          }
        } catch (err) {
          console.error('[Old2New] Auth callback error:', err.message)
          // Check whether a previous click already established a session
          try {
            const { data } = await supabase.auth.getSession()
            if (data?.session?.user) {
              console.log('[Old2New] Already signed in — navigating to app')
              localStorage.setItem('supabase-auth-complete', Date.now().toString())
              setUser(data.session.user)
              loadProfile(data.session.user.id)
              loadSavedRecipes(data.session.user.id)
              appInitializedRef.current = true
              inCallbackRef.current = false
              if (code || (hash && hash.includes('access_token'))) {
                goToApp()
              } else {
                setCallbackStatus('success')
                setTimeout(() => goToApp(), 400)
              }
              return
            }
          } catch {}
          const expired = err.message.toLowerCase().includes('expired') || err.message.toLowerCase().includes('invalid')
          setCallbackError(expired
            ? 'This confirmation link has expired or was already used. Please sign in — your email may already be verified.'
            : `Verification failed: ${err.message}`)
          setCallbackStatus('error')
        }
      })()
    } else if (path === '/' && params.get('login') === 'verified') {
      // Arrived here after email verification succeeded but session wasn't created
      localStorage.setItem('old2new_login_hint', 'Your email has been verified. Please sign in to continue.')
      window.history.replaceState({}, '', '/')
      setScreen('login')
    } else if (path === '/' && params.get('login') === 'reset') {
      localStorage.setItem('old2new_login_hint', 'Password updated! Sign in with your new password.')
      window.history.replaceState({}, '', '/')
      setScreen('login')
    } else if (path === '/' && window.location.hash.includes('access_token') && window.location.hash.includes('type=recovery')) {
      // Supabase sent recovery tokens in hash at root (redirectTo not whitelisted → site URL fallback).
      // detectSessionInUrl:false means Supabase will NOT auto-process this — we must setSession ourselves.
      const hp = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const at = hp.get('access_token')
      const rt = hp.get('refresh_token')
      window.history.replaceState({}, '', '/')
      localStorage.setItem('old2new_pending_reset', '1')
      console.log('[Old2New] Recovery hash at root — access_token present:', !!at, 'refresh_token present:', !!rt)
      ;(async () => {
        try {
          if (!at || !rt) throw new Error('Missing access_token or refresh_token in recovery hash')
          const { data, error } = await supabase.auth.setSession({ access_token: at, refresh_token: rt })
          if (error) throw error
          console.log('[Old2New] Root hash recovery session, user:', data?.session?.user?.email ?? null)
          if (!data?.session) throw new Error('setSession returned no session')
          setScreen('reset-password')
        } catch (err) {
          console.error('[Old2New] Root hash recovery error:', err.message)
          localStorage.removeItem('old2new_pending_reset')
          setScreen('login')
        }
      })()
    } else if (path === '/' && params.get('token_hash') && params.get('type') === 'recovery') {
      // Recovery link at root with query-param token_hash (older Supabase format)
      const tok = params.get('token_hash')
      window.history.replaceState({}, '', '/')
      localStorage.setItem('old2new_pending_reset', '1')
      console.log('[Old2New] Recovery token_hash at root — verifying')
      ;(async () => {
        try {
          const { data, error } = await supabase.auth.verifyOtp({ token_hash: tok, type: 'recovery' })
          if (error) throw error
          console.log('[Old2New] Root token_hash recovery, user:', data?.session?.user?.email ?? null)
          if (!data?.session) throw new Error('verifyOtp returned no session')
          await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token })
          setScreen('reset-password')
        } catch (err) {
          console.error('[Old2New] Root token_hash recovery error:', err.message)
          localStorage.removeItem('old2new_pending_reset')
          setScreen('login')
        }
      })()
    } else if (path === '/' && params.get('code')) {
      // OAuth code arrived at root instead of /auth/callback.
      // Covers: TWA WebView not receiving the deep-link redirect on first attempt,
      // or Supabase falling back to Site URL because /auth/callback isn't in the
      // allowed redirect URL list. detectSessionInUrl:false means Supabase won't
      // auto-process this — handle it the same way as the /auth/callback code branch.
      const code = params.get('code')
      window.history.replaceState({}, '', '/')
      setScreen('callback')
      inCallbackRef.current = true
      setCallbackType('oauth')
      console.log('[Old2New] OAuth Path Used: ROOT FALLBACK')
      ;(async () => {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          const session = data.session
          if (!session?.user) throw new Error('No session returned from code exchange.')
          console.log('[Old2New] Root OAuth code fallback — session established')
          localStorage.setItem('supabase-auth-complete', Date.now().toString())
          setUser(session.user)
          loadProfile(session.user.id)
          loadSavedRecipes(session.user.id)
          appInitializedRef.current = true
          inCallbackRef.current = false
          goToApp()
        } catch (err) {
          console.error('[Old2New] Root OAuth code fallback error:', err.message)
          try {
            const { data } = await supabase.auth.getSession()
            if (data?.session?.user) {
              console.log('[Old2New] Root OAuth code fallback — already signed in')
              localStorage.setItem('supabase-auth-complete', Date.now().toString())
              setUser(data.session.user)
              loadProfile(data.session.user.id)
              loadSavedRecipes(data.session.user.id)
              appInitializedRef.current = true
              inCallbackRef.current = false
              goToApp()
              return
            }
          } catch {}
          const expired = err.message.toLowerCase().includes('expired') || err.message.toLowerCase().includes('invalid')
          setCallbackError(expired
            ? 'This sign-in link has expired or was already used. Please try signing in again.'
            : `Sign-in failed: ${err.message}`)
          setCallbackStatus('error')
        }
      })()
    } else if (path === '/success') {
      setStripeSessionId(params.get('session_id'))
      setScreen('success')
    } else if (path === '/cancel') {
      setScreen('cancel')
    } else if (path.startsWith('/recipe/')) {
      const recipeId = path.split('/recipe/')[1]?.split('?')[0]
      if (recipeId) {
        setSharedRecipeId(recipeId)
        setScreen('recipe-share')
      }
    } else {
      console.log('[Old2New] OAuth Path Used: HOMEPAGE (NO CODE)')
    }
  }, [])

  // ── Handlers ─────────────────────────────────
  const handleAgreeDisclaimer = () => {
    localStorage.setItem('old2new_agreed', '1')
    setShowDisclaimer(false)
    setScreen(localStorage.getItem('old2new_onboarded') ? 'home' : 'onboarding')
  }

  const handleOnboardingComplete = (diets) => {
    localStorage.setItem('old2new_onboarded', '1')
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

    const limit = PLAN_LIMITS[plan]
    if (limit !== undefined && swapUsage.count >= limit) {
      setShowUpgradeModal(true); return
    }

    // Increment generation first so any in-flight request's catch/finally sees a stale
    // generation and bails out — prevents the old finally from killing the new overlay.
    const generation = ++transformGenerationRef.current
    abortControllerRef.current?.abort()

    const controller = new AbortController()
    abortControllerRef.current = controller
    isTimeoutRef.current = false
    setIsLoading(true)
    setError('')

    // 50s client timeout — Sonnet responses can take 30+ seconds under load.
    // Vercel's function limit is 55s (set in api/transform.js config.maxDuration).
    const timeoutId = setTimeout(() => {
      isTimeoutRef.current = true
      controller.abort()
    }, 50000)

    try {
      const res = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe: recipeInput, diets: selectedDiets, dietaryPreferences }),
        signal: controller.signal,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to transform recipe.')

      const result = { ...data, originalRecipe: recipeInput, diets: selectedDiets, id: Date.now() }
      setTransformResult(result)
      setScreen('results')
      // Close the loading overlay NOW — before any Supabase writes.
      // Awaiting Supabase on a poor Android/TWA connection can hang indefinitely,
      // leaving isLoading=true on top of every screen the user navigates to.
      if (transformGenerationRef.current === generation) setIsLoading(false)

      // Fire image generation asynchronously — recipe is visible, image loads in background
      if (result.imagePrompt) {
        fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagePrompt: result.imagePrompt }),
        })
          .then(r => r.ok ? r.json() : null)
          .then(img => {
            if (!img?.imageUrl) return
            setTransformResult(prev => {
              if (!prev || prev.id !== result.id) return prev
              const updated = { ...prev, imageUrl: img.imageUrl, imagePrompt: img.imagePrompt, imageModel: img.imageModel, imageGeneratedAt: img.imageGeneratedAt }
              // If the recipe was already saved (Supabase UUID), silently backfill the image
              if (typeof prev.id === 'string' && prev.id.includes('-')) {
                supabase.from('saved_recipes').update({ recipe_data: updated }).eq('id', prev.id).catch(() => {})
              }
              return updated
            })
          })
          .catch(err => console.error('[Old2New] Image error:', err.message))
      }

      const newCount = swapUsage.count + 1
      setSwapUsage(prev => ({ ...prev, count: newCount }))
      if (user) {
        supabase.from('profiles')
          .update({ swaps_used: newCount })
          .eq('id', user.id)
          .then(() => setProfile(prev => prev ? { ...prev, swaps_used: newCount } : prev))
          .catch(e => console.error('profile update:', e.message))
      }
    } catch (err) {
      // Stale request — a retry is already in flight, ignore this outcome entirely.
      if (transformGenerationRef.current !== generation) return
      if (err.name === 'AbortError') {
        if (isTimeoutRef.current) {
          setError('The transformation timed out. Please check your connection and try again.')
        }
        // User-initiated cancel: silent — they know what they did.
      } else {
        setError(err.message || 'Something went wrong. Please try again.')
      }
    } finally {
      clearTimeout(timeoutId)
      // Only the current generation closes the overlay.
      if (transformGenerationRef.current === generation) setIsLoading(false)
    }
  }

  const handleCancelTransform = () => {
    // Mark as user-initiated so the catch stays silent, then abort.
    isTimeoutRef.current = false
    abortControllerRef.current?.abort()
  }

  const handleSaveRecipe = async (currentIngredients) => {
    if (!transformResult || !user) return
    try {
      const title = transformResult.transformedRecipe?.name || transformResult.originalName || 'Saved Recipe'
      const { id: _tempId, ...recipeToStore } = transformResult

      const ingredientsChanged = currentIngredients &&
        JSON.stringify(currentIngredients) !== JSON.stringify(transformResult.transformedRecipe?.ingredients)

      if (currentIngredients) {
        recipeToStore.transformedRecipe = { ...recipeToStore.transformedRecipe, ingredients: currentIngredients }
      }

      if (ingredientsChanged) {
        const syncRes = await fetch('/api/sync-recipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipe: recipeToStore, dietaryPreferences }),
        })
        const syncBody = await syncRes.json()
        if (!syncRes.ok) {
          throw new Error(syncBody.error || 'Could not safely sync the updated recipe. Please try again.')
        }
        if (syncBody.transformedRecipe?.instructions) {
          recipeToStore.transformedRecipe = {
            ...recipeToStore.transformedRecipe,
            instructions: syncBody.transformedRecipe.instructions,
          }
        }
        if (syncBody.shoppingList) recipeToStore.shoppingList = syncBody.shoppingList
      }

      const { data, error } = await supabase
        .from('saved_recipes')
        .insert({ user_id: user.id, title, recipe_data: recipeToStore })
        .select('id')
        .single()
      if (error) throw error
      const savedResult = {
        ...transformResult,
        transformedRecipe: recipeToStore.transformedRecipe,
        shoppingList: recipeToStore.shoppingList,
        id: data.id,
      }
      setTransformResult(savedResult)
      setSavedRecipes(prev => [savedResult, ...prev.filter(r => r.id !== transformResult.id)])
    } catch (e) {
      console.error('handleSaveRecipe:', e.message)
      throw e
    }
  }

  const handleDeleteSaved = async (id) => {
    setSavedRecipes(prev => prev.filter(r => r.id !== id))
    try {
      await supabase.from('saved_recipes').delete().eq('id', id)
    } catch (e) {
      console.error('handleDeleteSaved:', e.message)
    }
  }

  const handleViewSaved  = (recipe) => { setTransformResult(recipe); setScreen('results') }
  const handleStartOver  = () => { setTransformResult(null); setError(''); setScreen('home') }

  const handleSelectIdea = (idea) => {
    setRecipeInput(`${idea.name}. ${idea.description}`)
    setScreen('home')
  }

  const handlePlanUpdate = async (newPlan) => {
    setPlan(newPlan)
    const resetUsage = { month: new Date().toISOString().slice(0, 7), count: 0 }
    setSwapUsage(resetUsage)
    if (user) {
      await supabase.from('profiles').update({ plan: newPlan, swaps_used: 0 }).eq('id', user.id)
      setProfile(prev => prev ? { ...prev, plan: newPlan, swaps_used: 0 } : prev)
    }
  }

  const handleSaveDietaryPreferences = async (prefs) => {
    if (!user) return
    setDietaryPreferences(prefs)
    setProfile(prev => prev ? { ...prev, dietary_preferences: prefs } : prev)
    try {
      await supabase.from('profiles').update({ dietary_preferences: prefs }).eq('id', user.id)
    } catch (e) {
      console.error('handleSaveDietaryPreferences:', e.message)
    }
  }

  const handleLogout = () => supabase.auth.signOut()

  // ── Auth loading screen ───────────────────────
  if (!authChecked) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: '0 32px' }}>
          <div style={{ fontSize: 56, marginBottom: 20, filter: 'drop-shadow(0 6px 16px rgba(34,197,94,0.4))' }}>🌿</div>
          <div className="loading-dots"><span /><span /><span /></div>
          {showLoadingRecovery && (
            <div style={{ marginTop: 28 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                Taking longer than expected.<br />Check your connection or tap below.
              </p>
              <button
                className="btn btn-primary"
                style={{ fontSize: 14, padding: '10px 28px', width: 'auto' }}
                onClick={() => setAuthChecked(true)}
              >
                Open App →
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render the homepage outside the mobile app shell so it fills the full browser width
  if (screen === 'splash') {
    return <SplashScreen onSignUp={() => setScreen('signup')} onLogin={() => setScreen('login')} />
  }

  const showNav = !['splash', 'signup', 'login', 'onboarding', 'callback', 'success', 'cancel', 'recipe-share', 'reset-password'].includes(screen)

  const renderScreen = () => {
    // Guard: unauthenticated users can only see landing, auth, and payment return screens
    if (!user && !['splash', 'signup', 'login', 'callback', 'success', 'cancel', 'recipe-share', 'reset-password'].includes(screen)) {
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
            plan={plan} swapUsage={swapUsage} onUpgrade={() => { if (!isTWA) setScreen('pricing') }}
            transformLimit={PLAN_LIMITS[plan]} dietaryPreferences={dietaryPreferences}
            onWhatSoundsGood={() => setScreen('suggest')}
          />
        )
      case 'results':
        return (
          <ResultsScreen
            result={transformResult} onSave={handleSaveRecipe}
            onShoppingList={() => setScreen('shopping')}
            onStartOver={handleStartOver} savedRecipes={savedRecipes}
            dietaryPreferences={dietaryPreferences}
          />
        )
      case 'shopping':
        return <ShoppingListScreen result={transformResult} onBack={() => setScreen('results')} />
      case 'saved':
        return <SavedRecipesScreen recipes={savedRecipes} onView={handleViewSaved} onDelete={handleDeleteSaved} plan={plan} />
      case 'pricing':
        if (isTWA) { setTimeout(() => setScreen('home'), 0); return null }
        return <PricingScreen plan={plan} swapUsage={swapUsage} onBack={() => setScreen('home')} user={user} />
      case 'callback': {
        const wrapStyle = {
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', textAlign: 'center',
          padding: 24,
          background: 'linear-gradient(160deg, var(--green-pale), var(--green-bg) 40%, white 100%)',
        }
        if (callbackStatus === 'success') {
          return (
            <div style={wrapStyle}>
              <div style={{ textAlign: 'center', maxWidth: 320 }}>
                <div style={{ fontSize: 64, marginBottom: 20, filter: 'drop-shadow(0 6px 16px rgba(34,197,94,0.4))' }}>🌿</div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
                  Email Verified!
                </h2>
                <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 28 }}>
                  Your account is ready. Taking you to the app…
                </p>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={goToApp}
                >
                  Continue to Old2New →
                </button>
              </div>
            </div>
          )
        }
        if (callbackStatus === 'error') {
          return (
            <div style={wrapStyle}>
              <div style={{ textAlign: 'center', maxWidth: 320 }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>⚠️</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>
                  Verification failed
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: 28 }}>
                  {callbackError || 'Something went wrong. Please try signing in — your email may already be verified.'}
                </p>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', marginBottom: 10 }}
                  onClick={() => { inCallbackRef.current = false; setScreen('login') }}
                >
                  Sign In
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ width: '100%' }}
                  onClick={() => { inCallbackRef.current = false; setScreen('signup') }}
                >
                  Sign Up Again
                </button>
              </div>
            </div>
          )
        }
        return (
          <div style={wrapStyle}>
            <div style={{ fontSize: 56, marginBottom: 16, filter: 'drop-shadow(0 6px 16px rgba(34,197,94,0.4))' }}>🌿</div>
            <p style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.5, color: 'var(--green-dark)', marginBottom: 8 }}>
              Old2New
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
              {callbackType === 'recovery' ? 'Verifying your reset link…' : callbackType === 'oauth' ? 'Signing you in…' : 'Verifying your email…'}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
              {callbackType === 'recovery' ? 'Setting up your new password…' : callbackType === 'oauth' ? 'Preparing your cookbook…' : 'Just a moment while we log you in.'}
            </p>
            <div className="loading-dots"><span /><span /><span /></div>
          </div>
        )
      }
      case 'about':
        return (
          <AboutScreen
            user={user} onLogout={handleLogout}
            dietaryPreferences={dietaryPreferences}
            onSavePreferences={handleSaveDietaryPreferences}
          />
        )
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
      case 'recipe-share':
        return (
          <RecipeShareScreen
            recipeId={sharedRecipeId}
            onSignUp={() => setScreen('signup')}
            onLogin={() => setScreen('login')}
          />
        )
      case 'suggest':
        return (
          <WhatSoundsGoodScreen
            dietaryPreferences={dietaryPreferences}
            onSelectIdea={handleSelectIdea}
            onBack={() => setScreen('home')}
          />
        )
      case 'reset-password':
        return (
          <ResetPasswordScreen
            onSuccess={async () => {
              await supabase.auth.signOut()
              window.location.replace('/?login=reset')
            }}
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
          isTWA={isTWA}
          onClose={() => setShowUpgradeModal(false)}
          onViewPlans={() => { setShowUpgradeModal(false); setScreen('pricing') }}
        />
      )}

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-overlay-icon">🌿</div>
          <h2>Transforming Recipe…</h2>
          <p>Old2New is making smart ingredient swaps for your healthy goals</p>
          <div className="loading-dots"><span /><span /><span /></div>
          {showTryAgain ? (
            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: 0 }}>
                Taking longer than expected…
              </p>
              <button
                onClick={handleTransform}
                style={{
                  background: 'white',
                  color: 'var(--green-dark)',
                  border: '2px solid var(--green-light)',
                  borderRadius: 12,
                  padding: '10px 28px',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                }}
              >
                🔄 Try Again
              </button>
              <button
                onClick={handleCancelTransform}
                style={{
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.75)',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                  padding: '4px 12px',
                }}
              >
                ← Back to Recipe
              </button>
            </div>
          ) : (
            <button
              onClick={handleCancelTransform}
              style={{
                marginTop: 24,
                background: 'transparent',
                color: 'rgba(255,255,255,0.5)',
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font)',
                padding: '4px 12px',
              }}
            >
              Cancel
            </button>
          )}
        </div>
      )}

      <main className={`screen ${!showNav ? 'no-nav' : ''}`}>
        {renderScreen()}
      </main>

      {showNav && (
        <BottomNav
          activeScreen={screen} onNavigate={setScreen}
          savedCount={savedRecipes.length} plan={plan} swapUsage={swapUsage}
          isTWA={isTWA}
        />
      )}

    </div>
  )
}
