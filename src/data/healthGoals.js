// Neutral, characteristic-based definitions of each transformation goal.
// Shown next to the goal chips (Home / Onboarding), in About → Supported
// Diets, and on the References page. Each definition describes the eating
// PATTERN the goal applies to a recipe — never a medical outcome — and names
// the source topics that back it (see healthSources.js).
export const HEALTH_GOALS = [
  {
    id: 'GLP-1 Friendly',
    icon: '💊',
    definition: 'Builds the recipe around lean protein, fiber-rich vegetables and whole grains with smaller, less greasy portions and less added sugar — an eating pattern many people choose when their appetite is reduced, including while taking a GLP-1 medication. It is a cooking style, not medical treatment; follow your prescriber\'s and dietitian\'s advice.',
    topics: ['glp1-friendly', 'high-protein', 'fiber', 'portions'],
  },
  {
    id: 'Keto',
    icon: '🥑',
    definition: 'Keeps carbohydrates very low and uses fats and protein for most calories, replacing flour, sugar and starchy ingredients with lower-carbohydrate alternatives.',
    topics: ['keto', 'low-sugar'],
  },
  {
    id: 'Mediterranean',
    icon: '🫒',
    definition: 'Applies the Mediterranean dietary pattern: olive oil instead of butter or lard, more vegetables and legumes, whole grains, fish and poultry over red and processed meat, and less saturated fat and added sugar — while keeping your dish and its cuisine.',
    topics: ['mediterranean', 'saturated-fat'],
  },
  {
    id: 'High Protein',
    icon: '💪',
    definition: 'Raises the protein per serving with leaner cuts, legumes, eggs, Greek yogurt, cottage cheese or higher-protein grains, without turning the dish into something else.',
    topics: ['high-protein'],
  },
  {
    id: 'Low Sugar',
    icon: '🍬',
    definition: 'Reduces added sugars — syrups, sweetened sauces, refined sweeteners — using fruit, spices or FDA-permitted sugar substitutes where sweetness is needed.',
    topics: ['low-sugar', 'sweeteners'],
  },
  {
    id: 'Low Calorie',
    icon: '🔥',
    definition: 'Lowers the estimated calories per serving by trimming added fats and sugars and adding volume from vegetables, while keeping portions satisfying.',
    topics: ['low-calorie', 'portions'],
  },
  {
    id: 'Diabetic Friendly',
    icon: '❤️',
    definition: 'Follows general diabetes eating guidance: more fiber and non-starchy vegetables, whole grains instead of refined ones, lean protein, and less added sugar and saturated fat. "Friendly" describes the recipe\'s ingredient profile; it does not mean a recipe is safe or suitable for any individual — carbohydrate needs vary and your care team sets your targets.',
    topics: ['diabetic-friendly', 'fiber', 'low-sugar', 'glycemic-index'],
  },
]

export const GOAL_BY_ID = Object.fromEntries(HEALTH_GOALS.map(g => [g.id, g]))

// Topics to cite for a list of selected goals (plus the nutrition-estimate
// methodology, which applies to every transformed recipe).
export function topicsForGoals(goalIds = []) {
  const topics = new Set(['nutrition-estimates'])
  for (const id of goalIds) for (const t of GOAL_BY_ID[id]?.topics || []) topics.add(t)
  return [...topics]
}
