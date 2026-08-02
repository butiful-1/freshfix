// Official "Get it on Google Play" badge — downloaded directly from Google
// (play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png),
// not recreated. Google's brand guidelines require the badge's proportions
// to be preserved and prohibit modifying, recoloring, or stretching it —
// height is constrained, width is `auto` so the native 646:250 aspect ratio
// is never distorted.
export default function GooglePlayBadge() {
  return (
    <a
      href="https://play.google.com/store/apps/details?id=app.old2new.twa"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Download Old2New on Google Play"
      style={{ display: 'inline-block', lineHeight: 0 }}
    >
      <img
        src="/images/google-play-badge.png"
        alt="Get it on Google Play"
        style={{ height: 54, width: 'auto', display: 'block' }}
      />
    </a>
  )
}
