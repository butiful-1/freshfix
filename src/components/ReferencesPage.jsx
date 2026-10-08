import useDocumentHead from '../seo/useDocumentHead.js'
import { PublicHeader, PublicFooter } from './shared/PublicPageChrome.jsx'
import ReferencesScreen from './ReferencesScreen.jsx'

const SF = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

// Public web route /references — the same central source library the app
// shows in-app, wrapped in the public page chrome.
export default function ReferencesPage({ onSignUp, onLogin }) {
  useDocumentHead({
    title: 'Sources & References — Old2New',
    description: 'The authoritative sources behind Old2New\'s nutrition estimates and diet-style definitions, plus how nutrition values are estimated.',
    canonical: 'https://old2new.app/references',
  })
  return (
    <div style={{ background: 'white', minHeight: '100vh', fontFamily: SF }}>
      <PublicHeader onSignUp={onSignUp} onLogin={onLogin} />
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 40px' }}>
        <h1 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 34, fontWeight: 700, color: '#111827', letterSpacing: -1, marginBottom: 6 }}>Sources &amp; References</h1>
        <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.6, marginBottom: 16 }}>
          Where Old2New's health and nutrition information comes from, and how nutrition values are estimated.
        </p>
        <ReferencesScreen embedded />
      </main>
      <PublicFooter />
    </div>
  )
}
