import useDocumentHead from '../seo/useDocumentHead.js'
import { itemListJsonLd, RECIPES_INDEX_META } from '../seo/seoHelpers.js'
import { PUBLIC_RECIPES } from '../data/publicRecipes.js'
import { PublicHeader, PublicFooter } from './shared/PublicPageChrome.jsx'

const T  = '#111827'
const TM = '#6B7280'
const SF = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const SRF = 'Georgia, "Times New Roman", serif'

// Data-driven library page — one template, fed entirely by PUBLIC_RECIPES.
// Adding a 5th (or 50th) recipe means pushing a record to that array; this
// component needs no changes. Leaves room for future category/filter UI
// (the data records already carry `healthGoal`) without building it yet.
export default function PublicRecipesIndex({ onSignUp, onLogin }) {
  useDocumentHead({
    title: RECIPES_INDEX_META.title,
    description: RECIPES_INDEX_META.description,
    canonical: RECIPES_INDEX_META.canonical,
    image: RECIPES_INDEX_META.image,
    jsonLd: itemListJsonLd(PUBLIC_RECIPES),
  })

  return (
    <div style={{ background: 'white', minHeight: '100vh', fontFamily: SF, overflowX: 'hidden' }}>
      <PublicHeader onSignUp={onSignUp} onLogin={onLogin} />

      <main>
        <section style={{ padding: '72px 40px 24px', textAlign: 'center' }}>
          <h1 style={{
            fontFamily: SRF, fontSize: 'clamp(32px, 4.5vw, 56px)', fontWeight: 700,
            color: T, letterSpacing: -1.5, lineHeight: 1.05, marginBottom: 20,
          }}>
            Recipe Transformations
          </h1>
          <p style={{ fontSize: 17, color: TM, lineHeight: 1.7, maxWidth: 620, margin: '0 auto', fontFamily: SF }}>
            See how Old2New gives familiar favorites a fresh new direction while keeping the comfort you love.
          </p>
        </section>

        <section style={{ padding: '48px 40px 108px' }}>
          <div style={{ maxWidth: 1240, margin: '0 auto' }}>
            <ul className="hp-recipes-grid" style={{ listStyle: 'none' }}>
              {PUBLIC_RECIPES.map(recipe => (
                <li key={recipe.slug} style={{ margin: 0 }}>
                  <a
                    href={`/recipes/${recipe.slug}`}
                    style={{ display: 'block', textDecoration: 'none', color: 'inherit', borderRadius: 4 }}
                  >
                    <figure style={{ margin: 0 }}>
                      <img
                        src={recipe.heroImage}
                        alt={recipe.heroImageAlt}
                        style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 3, display: 'block' }}
                      />
                      <figcaption style={{ marginTop: 16 }}>
                        <span style={{
                          display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: 1,
                          textTransform: 'uppercase', color: '#7D8E7F', marginBottom: 6, fontFamily: SF,
                        }}>
                          {recipe.healthGoal}
                        </span>
                        <div style={{ fontSize: 16, fontWeight: 600, color: T, lineHeight: 1.4, fontFamily: SF }}>
                          {recipe.title}
                        </div>
                      </figcaption>
                    </figure>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
