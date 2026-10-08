// Deterministic guard for medical-claim language in model output. Runs on
// every transform / suggest / sync result (~1 ms). When a banned pattern is
// found the caller may try one model rewrite of just the offending fields;
// if that fails, the offending SENTENCES are removed so a claim never reaches
// the user. Patterns are deliberately narrow (treatment / prevention /
// "safe for" / medication-recommendation language), not general health words.
export const CLAIM_PATTERNS = [
  /\bsafe\s+for\s+(?:(?:people|those|anyone|patients|someone|individuals)\s+(?:with|who\s+have|living\s+with)\s+)?(?:diabet|celiac|allerg|hypertens|kidney|heart\s+disease)/i,
  /\b(?:controls?|controlling|regulates?|regulating|stabili[sz]es?|stabili[sz]ing|normali[sz]es?|manages?|managing|lowers?|lowering|reduces?|reducing)\s+(?:your\s+|the\s+|their\s+)?(?:blood\s+sugar|blood\s+glucose|glucose\s+levels?|insulin\s+resistance|a1c|cholesterol|blood\s+pressure|inflammation)\b/i,
  /\b(?:treats?|treating|cures?|curing|prevents?|preventing|reverses?|reversing|heals?|healing|fights?|fighting)\s+(?:\w+\s+){0,3}?(?:diabetes|disease|cancer|inflammation|obesity|insulin\s+resistance|heart\s+disease|hypertension|conditions?|illness)/i,
  /\b(?:eliminates?|eliminating|prevents?|avoids?|stops?)\s+(?:the\s+|any\s+|a\s+)?(?:blood\s+sugar|glucose|insulin)\s+spikes?\b/i,
  /\b(?:no|zero)\s+(?:glycemic|blood\s+sugar|glucose)\s+(?:impact|effect|response)\b/i,
  /\b(?:recommended|ideal|perfect|essential|required|designed|necessary)\s+for\s+(?:everyone|anyone|all\s+people|people|patients|those|someone)\s+(?:taking|on|using|prescribed)\s+(?:a\s+)?(?:glp-?1|ozempic|wegovy|mounjaro|zepbound|semaglutide|tirzepatide|insulin|metformin|medication)/i,
  /\b(?:clinically|scientifically|medically)\s+(?:proven|shown|approved|recommended)\b/i,
  /\bdoctor[-\s]approved\b/i,
  /\bnature'?s\s+(?:pharmacy|medicine\s+cabinet|medicine)\b/i,
  /\banti-?inflammatory\s+(?:pharmacy|medicine|drug|effects?\s+(?:that|which)\s+(?:treat|cure|heal))\b/i,
  /\b(?:well[-\s]documented|proven|powerful)\s+(?:anti-?inflammatory|blood[-\s]sugar[-\s]lowering|glucose[-\s]lowering|cholesterol[-\s]lowering)\s+(?:effects?|benefits?|properties|power)\b/i,
  /\b(?:research|studies|science)\s+(?:suggests?|shows?|proves?|confirms?)\s+(?:[\w-]+\s+){0,8}?(?:blood\s+sugar|glucose|insulin|a1c|cholesterol|inflammation|weight\s+loss)/i,
  /\b(?:burns?|melts?)\s+(?:away\s+)?(?:belly\s+)?fat\b/i,
  /\b(?:guaranteed?|will)\s+(?:help\s+you\s+)?lose\s+weight\b/i,
  /\bboosts?\s+(?:your\s+)?(?:immune\s+system|immunity|metabolism)\b/i,
  /\bdetox(?:es|ify|ifies|ifying)?\b/i,
  // insulin / glucose physiology claims
  /\b(?:improv|support|boost|enhanc|increas|restor)\w*\s+(?:your\s+|the\s+)?insulin\s+sensitivity\b/i,
  /\binsulin\s+(?:resistance|sensitivity)\s+management\b/i,
  /\b(?:do(?:es)?\s+not|don'?t|won'?t|never|without)\s+(?:significantly\s+)?(?:rais|spik|affect|impact|elevat)\w*\s+(?:your\s+)?(?:blood\s+sugar|blood\s+glucose|glucose|insulin)/i,
  /\b(?:spikes?|spiking)\s+(?:your\s+)?(?:blood\s+sugar|blood\s+glucose|insulin)\b/i,
  /\b(?:blunts?|blunting|curbs?|flattens?)\s+(?:\w+\s+){0,3}?(?:blood\s+sugar|glucose)\s+(?:rises?|spikes?|response)/i,
  /\bslows?\s+(?:down\s+)?(?:the\s+)?(?:glucose|sugar|carbohydrate)\s+absorption\b/i,
  /\b(?:improves?|better|healthier)\s+(?:the\s+)?(?:overall\s+)?glycemic\s+(?:profile|response|control)\b/i,
  // inflammation claims
  /\b(?:has|have|with|possess\w*)\s+(?:\w+\s+){0,2}?anti-?inflammatory\s+(?:properties|effects?|compounds?|activity|benefits?)\b/i,
  /\banti-?inflammatory\s+(?:compound|polyphenols?|pathways?|response|research\s+backing|spicing)\b/i,
  /\b(?:promotes?|contributes?\s+to|causes?|triggers?|drives?|calms?|fights?|lowers?)\s+(?:chronic\s+)?inflammation\b/i,
  /\bsimilar\s+in\s+action\s+to\s+(?:ibuprofen|aspirin|\w+\s+drugs?)\b/i,
  /\b(?:well[-\s]studied|has\s+been\s+shown|have\s+been\s+shown|shown\s+in\s+studies|studies\s+show|research\s+shows)\b/i,
  /\bgold\s+standard\s+of\s+(?:anti-?inflammatory|diabetic|healthy)/i,
  /\bideal\s+for\s+(?:insulin|diabet|blood\s+sugar|glucose|inflammation)/i,
]

export function findClaimViolations(text) {
  if (typeof text !== 'string' || !text) return []
  const hits = []
  for (const re of CLAIM_PATTERNS) {
    const m = text.match(re)
    if (m) hits.push(m[0])
  }
  return hits
}

// Text fields that reach the user from a transform result.
export function transformTextFields(result) {
  const fields = []
  if (!result || typeof result !== 'object') return fields
  const push = (path, get, set) => { const v = get(); if (typeof v === 'string' && v) fields.push({ path, value: v, set }) }
  push('whyTheseSwaps', () => result.whyTheseSwaps, v => { result.whyTheseSwaps = v })
  push('encouragement', () => result.encouragement, v => { result.encouragement = v })
  ;(result.ingredientSwaps || []).forEach((s, i) => push(`ingredientSwaps[${i}].reason`, () => s?.reason, v => { s.reason = v }))
  ;(result.transformedRecipe?.ingredients || []).forEach((ing, i) => push(`ingredients[${i}].note`, () => ing?.note, v => { ing.note = v }))
  ;(result.transformedRecipe?.instructions || []).forEach((step, i) => push(`instructions[${i}]`, () => step, v => { result.transformedRecipe.instructions[i] = v }))
  return fields
}

// Text fields that reach the user from a "What Sounds Good" idea list.
export function ideaTextFields(ideas) {
  const fields = []
  ;(ideas || []).forEach((idea, i) => {
    if (typeof idea?.description === 'string') fields.push({ path: `ideas[${i}].description`, value: idea.description, set: v => { idea.description = v } })
    if (typeof idea?.name === 'string') fields.push({ path: `ideas[${i}].name`, value: idea.name, set: v => { idea.name = v } })
  })
  return fields
}

export function checkClaims(fields) {
  const violations = []
  for (const f of fields) {
    const hits = findClaimViolations(f.value)
    if (hits.length) violations.push({ path: f.path, hits, field: f })
  }
  return violations
}

export const NEUTRAL_WHY = 'These swaps change the ingredient profile of the dish — see the Sources link for the general nutrition guidance behind each goal. Nutrition values are estimates. Please consult your doctor or a registered dietitian before making dietary changes.'

// Deterministic fallback: drop the sentences that contain a violation.
export function stripClaimSentences(text) {
  const sentences = text.split(/(?<=[.!?])\s+/)
  const kept = sentences.filter(s => findClaimViolations(s).length === 0)
  return kept.join(' ').trim()
}

// Enforce: returns the number of fields changed. Never throws.
export function enforceClaims(fields, violations, { neutralDefault = NEUTRAL_WHY } = {}) {
  let changed = 0
  for (const v of violations) {
    const stripped = stripClaimSentences(v.field.value)
    const next = stripped || (v.path === 'whyTheseSwaps' ? neutralDefault : '')
    if (next !== v.field.value) { v.field.set(next); changed++ }
  }
  return changed
}

// One model rewrite of only the offending fields, then a deterministic check;
// anything still violating is stripped. `client` is an Anthropic client.
export async function repairClaims(client, fields, violations, { model = 'claude-haiku-4-5-20251001' } = {}) {
  if (!violations.length) return { rewritten: 0, stripped: 0 }
  let rewritten = 0
  if (client) {
    try {
      const items = violations.map(v => ({ path: v.path, text: v.field.value, problems: v.hits }))
      const msg = await client.messages.create({
        model,
        max_tokens: 1500,
        system: 'You rewrite short recipe text so it contains no medical or treatment claims. Keep the friendly tone and the cooking facts. Describe ingredient characteristics (lower in added sugar, higher in fiber, more protein) instead of effects on any disease, blood sugar, medication, or weight. Respond ONLY with JSON: {"rewrites":[{"path":"...","text":"..."}]}',
        messages: [{ role: 'user', content: JSON.stringify({ items }) }],
      })
      const raw = msg.content?.[0]?.text || ''
      const start = raw.indexOf('{'); const end = raw.lastIndexOf('}')
      const parsed = JSON.parse(raw.slice(start, end + 1))
      for (const r of parsed.rewrites || []) {
        const v = violations.find(x => x.path === r.path)
        if (v && typeof r.text === 'string' && r.text.trim() && findClaimViolations(r.text).length === 0) {
          v.field.set(r.text.trim()); v.field.value = r.text.trim(); v.repaired = true; rewritten++
        }
      }
    } catch (e) {
      console.error('[claimGuard] rewrite failed:', e.message)
    }
  }
  const remaining = violations.filter(v => !v.repaired)
  const stripped = enforceClaims(fields, remaining)
  return { rewritten, stripped }
}

// Convenience for handlers: check → repair → enforce. Mutates `result` in place.
export async function guardTransformResult(result, client) {
  const fields = transformTextFields(result)
  const violations = checkClaims(fields)
  if (!violations.length) return { violations: 0 }
  console.warn('[claimGuard] transform violations:', violations.map(v => `${v.path}: ${v.hits.join(' | ')}`).join('; '))
  const out = await repairClaims(client, fields, violations)
  return { violations: violations.length, ...out }
}

export async function guardIdeas(ideas, client) {
  const fields = ideaTextFields(ideas)
  const violations = checkClaims(fields)
  if (!violations.length) return { violations: 0 }
  console.warn('[claimGuard] idea violations:', violations.map(v => `${v.path}: ${v.hits.join(' | ')}`).join('; '))
  const out = await repairClaims(client, fields, violations)
  return { violations: violations.length, ...out }
}
