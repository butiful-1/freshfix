// Builds dist-ios/: a copy of dist/ for the Capacitor iOS app without the
// prerendered marketing pages and the ~300 MB of blog hero images. The app
// serves those routes from the SPA and loads blog images from production
// (see assetUrl in src/apiBase.js). Run via `npm run ios:sync`.
import { cpSync, rmSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SRC = 'dist', OUT = 'dist-ios'
// Directories only needed for SEO / crawlers on the web
const DROP_DIRS = ['blog', 'recipes', 'about', 'contact']
// Images the app UI itself uses (everything else in images/ is blog-only)
const KEEP_IMAGE_PREFIXES = ['bg-', 'badges', 'google-play-badge', 'hero-', 'showcase-', 'story-', '4-easy-steps', 'app-step-']

if (!existsSync(SRC)) { console.error('[sync-ios] run `npm run build` first'); process.exit(1) }
rmSync(OUT, { recursive: true, force: true })
cpSync(SRC, OUT, {
  recursive: true,
  filter: (src) => {
    const rel = src.slice(SRC.length + 1)
    if (!rel) return true
    const top = rel.split('/')[0]
    if (DROP_DIRS.includes(top)) return false
    if (top === 'images' && rel !== 'images') {
      const name = rel.slice('images/'.length)
      return KEEP_IMAGE_PREFIXES.some(p => name.startsWith(p))
    }
    return true
  },
})
const kept = readdirSync(join(OUT, 'images')).length
console.log(`[sync-ios] wrote ${OUT}/ (images kept: ${kept})`)
