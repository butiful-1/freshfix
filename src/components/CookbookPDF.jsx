import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

const GREEN      = '#16A34A'
const GREEN_DARK = '#14532D'
const GREEN_PALE = '#F0FDF4'
const MUTED      = '#6B7280'
const BORDER     = '#E5E7EB'
const TEXT       = '#111827'
const TEXT_SEC   = '#374151'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: TEXT,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
  },

  // ── Cover ───────────────────────────────────────
  coverPage: {
    fontFamily: 'Helvetica',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 48,
  },
  coverAccent: {
    width: 56,
    height: 4,
    backgroundColor: GREEN,
    borderRadius: 2,
    marginBottom: 24,
  },
  coverTitle: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    color: GREEN_DARK,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 40,
  },
  coverMeta: {
    backgroundColor: GREEN_PALE,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    display: 'flex',
    flexDirection: 'row',
    gap: 32,
  },
  coverMetaItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  coverMetaValue: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: GREEN_DARK,
  },
  coverMetaLabel: {
    fontSize: 9,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coverFooter: {
    position: 'absolute',
    bottom: 40,
    fontSize: 9,
    color: MUTED,
    textAlign: 'center',
  },

  // ── Recipe page ─────────────────────────────────
  recipeName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: GREEN_DARK,
    marginBottom: 6,
    lineHeight: 1.2,
  },
  metaRow: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  badge: {
    backgroundColor: GREEN_PALE,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 7,
    fontSize: 8,
    color: GREEN_DARK,
    fontFamily: 'Helvetica-Bold',
  },
  metaText: {
    fontSize: 9,
    color: MUTED,
    marginBottom: 14,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 12,
  },

  // ── Sections ────────────────────────────────────
  sectionLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 7,
  },
  ingredientRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  ingredientDot: {
    fontSize: 10,
    color: GREEN,
    marginTop: 0,
    lineHeight: 1.4,
  },
  ingredientText: {
    fontSize: 10,
    color: TEXT_SEC,
    lineHeight: 1.4,
    flex: 1,
  },
  ingredientNote: {
    fontSize: 8,
    color: MUTED,
    lineHeight: 1.4,
    fontStyle: 'italic',
  },
  stepRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  stepNumber: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: GREEN,
    width: 14,
    lineHeight: 1.5,
  },
  stepText: {
    fontSize: 10,
    color: TEXT_SEC,
    lineHeight: 1.5,
    flex: 1,
  },

  // ── Nutrition ───────────────────────────────────
  nutritionBox: {
    backgroundColor: GREEN_PALE,
    borderRadius: 6,
    padding: 10,
    marginTop: 14,
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  nutritionItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 60,
  },
  nutritionValue: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: GREEN_DARK,
  },
  nutritionLabel: {
    fontSize: 8,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 1,
  },

  // ── Page footer ─────────────────────────────────
  pageFooter: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageFooterText: {
    fontSize: 8,
    color: MUTED,
  },
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function RecipePage({ recipe, pageNumber, total }) {
  const r   = recipe.transformedRecipe || {}
  const m   = recipe.macros?.after || {}
  const cal = recipe.caloriesAfter

  const metaParts = [
    r.servings ? `${r.servings} serving${r.servings !== 1 ? 's' : ''}` : null,
    r.prepTime  ? `Prep: ${r.prepTime}`  : null,
    r.cookTime  ? `Cook: ${r.cookTime}`  : null,
  ].filter(Boolean).join('  ·  ')

  const hasNutrition = cal || m.protein || m.carbs || m.fat || m.fiber

  return (
    <Page size="A4" style={styles.page} wrap>
      {/* Recipe name */}
      <Text style={styles.recipeName}>{recipe.transformedRecipe?.name || recipe.originalName || 'Recipe'}</Text>

      {/* Diet badges */}
      {recipe.diets?.length > 0 && (
        <View style={styles.metaRow}>
          {recipe.diets.map((d, i) => (
            <Text key={i} style={styles.badge}>{d}</Text>
          ))}
        </View>
      )}

      {/* Servings / times */}
      {metaParts ? <Text style={styles.metaText}>{metaParts}</Text> : null}

      <View style={styles.divider} />

      {/* Ingredients */}
      {r.ingredients?.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>Ingredients</Text>
          {r.ingredients.map((ing, i) => (
            <View key={i} style={styles.ingredientRow}>
              <Text style={styles.ingredientDot}>•</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.ingredientText}>
                  {[ing.amount, ing.item].filter(Boolean).join(' ')}
                  {ing.note ? (
                    <Text style={styles.ingredientNote}> ({ing.note})</Text>
                  ) : null}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Instructions */}
      {r.instructions?.length > 0 && (
        <View style={{ marginTop: 14 }}>
          <Text style={styles.sectionLabel}>Instructions</Text>
          {r.instructions.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <Text style={styles.stepNumber}>{i + 1}.</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Nutrition */}
      {hasNutrition && (
        <View>
          <View style={styles.nutritionBox}>
            {cal     ? <View style={styles.nutritionItem}><Text style={styles.nutritionValue}>{cal}</Text><Text style={styles.nutritionLabel}>Calories</Text></View> : null}
            {m.protein ? <View style={styles.nutritionItem}><Text style={styles.nutritionValue}>{m.protein}g</Text><Text style={styles.nutritionLabel}>Protein</Text></View> : null}
            {m.carbs   ? <View style={styles.nutritionItem}><Text style={styles.nutritionValue}>{m.carbs}g</Text><Text style={styles.nutritionLabel}>Carbs</Text></View> : null}
            {m.fat     ? <View style={styles.nutritionItem}><Text style={styles.nutritionValue}>{m.fat}g</Text><Text style={styles.nutritionLabel}>Fat</Text></View> : null}
            {m.fiber   ? <View style={styles.nutritionItem}><Text style={styles.nutritionValue}>{m.fiber}g</Text><Text style={styles.nutritionLabel}>Fiber</Text></View> : null}
          </View>
        </View>
      )}

      {/* Page footer */}
      <View style={styles.pageFooter} fixed>
        <Text style={styles.pageFooterText}>Old2New — Not medical advice. Consult your physician before changing your diet.</Text>
        <Text style={styles.pageFooterText}>{pageNumber} / {total}</Text>
      </View>
    </Page>
  )
}

export default function CookbookPDF({ recipes, generatedDate }) {
  const totalPages = 1 + recipes.length

  return (
    <Document title="My Old2New Cookbook" author="Old2New" creator="Old2New">
      {/* Cover */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverAccent} />
        <Text style={styles.coverTitle}>My Old2New Cookbook</Text>
        <Text style={styles.coverSubtitle}>Healthy recipes, transformed for you</Text>
        <View style={styles.coverMeta}>
          <View style={styles.coverMetaItem}>
            <Text style={styles.coverMetaValue}>{recipes.length}</Text>
            <Text style={styles.coverMetaLabel}>{recipes.length === 1 ? 'Recipe' : 'Recipes'}</Text>
          </View>
          <View style={styles.coverMetaItem}>
            <Text style={styles.coverMetaValue}>{generatedDate}</Text>
            <Text style={styles.coverMetaLabel}>Generated</Text>
          </View>
        </View>
        <Text style={styles.coverFooter}>
          Old2New is for informational purposes only. Not medical advice.{'\n'}
          Consult your physician before making dietary changes.
        </Text>
      </Page>

      {/* One page per recipe */}
      {recipes.map((recipe, i) => (
        <RecipePage
          key={recipe.id || i}
          recipe={recipe}
          pageNumber={i + 2}
          total={totalPages}
        />
      ))}
    </Document>
  )
}
