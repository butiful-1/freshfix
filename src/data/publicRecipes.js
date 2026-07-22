// ─────────────────────────────────────────────────────────────────────────
// PUBLIC RECIPE TRANSFORMATIONS — curated, static, read-only demo content
// ─────────────────────────────────────────────────────────────────────────
// Powers the public /recipes index and /recipes/:slug pages.
//
// SOURCE OF TRUTH: every field below (ingredients, instructions, swaps,
// whyTheseSwaps, macros, calories, servings/times, hero image) is copied
// verbatim from the real, already-generated rows in the Supabase
// `saved_recipes` table (readable via the table's own `public_read` RLS
// policy — see supabase/migrations/001_saved_recipes.sql — the same policy
// that already powers recipe sharing elsewhere in the app). Nothing here is
// invented or regenerated. Source recipe IDs are noted per record below so
// this can be re-synced if the underlying transformation is ever edited.
//
// The only editorial liberty taken is the public-facing `title` for the
// pizza record: the real saved recipe's title is the long
// "GLP-1 Friendly High-Protein Keto Mediterranean Diet Pizza" — too long for
// a homepage card — so it's displayed as "Lighter Protein Pizza" while
// `healthGoals` still lists all four real applicable goals and every other
// field is the unmodified real transformation.
//
// To add a new featured recipe: pull its row from `saved_recipes` (by id)
// and push a matching record to PUBLIC_RECIPES with a unique `slug`.
// Everything else (index page, template page, sitemap, JSON-LD) picks it up
// automatically.

export const SITE_URL = 'https://old2new.app'

// Exact existing product wording — do not edit without re-checking
// OnboardingScreen.jsx / HomeScreen.jsx for drift.
export const SUPPORTED_HEALTH_GOALS = [
  'GLP-1 Friendly',
  'Keto',
  'Mediterranean',
  'High Protein',
  'Low Sugar',
  'Low Calorie',
  'Diabetic Friendly',
]

export const PUBLIC_RECIPES = [
  {
    // source: saved_recipes.id a6596ae1-981b-4ee4-9839-9978d6823c9d
    slug: 'insulin-friendly-cherry-bounty-bars',
    title: 'Insulin-Friendly Cherry Bounty Bars (No-Bake, Vegan)',
    originalTitle: 'Cherry Bounty Bars (Vegan, No-Bake)',
    originalRecipeUrl: 'https://nourishingamy.com/2023/09/28/cherry-bounty-bars-vegan-no-bake/',
    healthGoals: ['Insulin-Friendly'],
    healthGoal: 'Insulin-Friendly',
    summary: "Managing insulin resistance doesn't mean saying goodbye to delicious no-bake treats — it means getting smarter about the ingredients you love. These Cherry Bounty Bars are proof that your favorite comforts can absolutely come along for the ride on your health journey!",
    heroImage: 'https://hjtwpyauadgfhdurbmdr.supabase.co/storage/v1/object/public/recipe-images/22e8b518-429b-4f9e-a784-4bc0f93b0d61.png',
    heroImageAlt: 'Sliced no-bake coconut and cherry bars coated in dark chocolate, arranged on a wooden board',
    servings: 12,
    prepTime: '20 mins',
    cookTime: '0 mins (plus 60 mins chilling)',
    caloriesBefore: 210,
    caloriesAfter: 165,
    ingredients: [
      { item: 'unsweetened desiccated coconut', amount: '2 cups', note: 'same as original — coconut is naturally low-glycemic' },
      { item: 'coconut cream (full-fat, no additives)', amount: '3 tbsp', note: 'same as original — provides binding and richness' },
      { item: 'pure monk fruit sweetener (or erythritol)', amount: '1.5 tbsp', note: 'swapped from maple syrup/icing sugar — zero glycemic impact' },
      { item: 'pure vanilla extract', amount: '1 tsp', note: '' },
      { item: 'fine sea salt', amount: '1 pinch', note: '' },
      { item: 'freeze-dried cherries, crushed', amount: '1/2 cup', note: 'swapped from maraschino or sweetened cherries — no added sugar, concentrated natural flavor' },
      { item: 'fresh or frozen tart cherries, finely chopped', amount: '2 tbsp', note: 'adds real cherry texture with lower sugar than sweetened varieties' },
      { item: '85–90% dark chocolate (dairy-free / vegan)', amount: '170g (6 oz)', note: 'swapped from milk chocolate or standard dark chocolate — higher cacao = lower sugar, richer in flavonoids' },
      { item: 'unrefined coconut oil', amount: '1 tsp', note: 'helps chocolate melt smoothly' },
      { item: 'almond flour', amount: '1 tbsp', note: 'optional — adds a little protein and fiber to help bind and slow glucose absorption' },
    ],
    ingredientNotes: [],
    instructions: [
      'Line a small rectangular baking dish or loaf tin (roughly 8x4 inches) with parchment paper, leaving overhang on the sides for easy removal.',
      'In a large mixing bowl, combine the desiccated coconut, coconut cream, monk fruit sweetener, vanilla extract, sea salt, and almond flour (if using). Mix well until a thick, moldable dough forms. If too dry, add coconut cream 1 tsp at a time.',
      'Gently fold in the freeze-dried crushed cherries and finely chopped fresh or frozen tart cherries until evenly distributed throughout the coconut mixture.',
      'Press the coconut-cherry mixture firmly and evenly into the prepared tin. Smooth the top with the back of a spoon or a spatula.',
      'Place the tin in the freezer for 30 minutes until the filling is firm and set.',
      'Once firm, lift the slab out using the parchment overhang and place on a cutting board. Slice into 12 even bars.',
      'Melt the dark chocolate and coconut oil together in a heatproof bowl over a pot of simmering water (double boiler), stirring until fully smooth. Remove from heat and let cool for 2–3 minutes.',
      'Line a baking tray with parchment. One at a time, place each coconut bar on a fork and spoon the melted chocolate over it to coat evenly. Let any excess drip off, then set on the parchment-lined tray.',
      'Once all bars are coated, return the tray to the freezer or refrigerator for at least 30 minutes until the chocolate shell is completely set.',
      'Store bars in an airtight container in the refrigerator for up to 1 week or in the freezer for up to 1 month. Allow to sit at room temperature for 3–5 minutes before eating for the best texture.',
    ],
    swaps: [
      { original: 'Maple syrup or icing sugar as sweetener', swapped: 'Monk fruit sweetener or erythritol', reason: 'Maple syrup and icing sugar spike blood glucose rapidly. Monk fruit and erythritol have a glycemic index of zero and do not raise insulin levels, making them ideal for insulin resistance management.' },
      { original: 'Sweetened or maraschino cherries', swapped: 'Freeze-dried unsweetened cherries + fresh/frozen tart cherries', reason: 'Sweetened cherries add significant sugar. Freeze-dried unsweetened cherries deliver intense cherry flavor without added sugars. Fresh or frozen tart cherries are lower in sugar than sweet varieties and contain anthocyanins that may support insulin sensitivity.' },
      { original: 'Milk chocolate or standard semi-sweet chocolate coating', swapped: '85–90% dark chocolate (dairy-free)', reason: 'Higher cacao percentage means significantly less sugar per serving. Very dark chocolate has a lower glycemic impact and provides flavonoids that research associates with improved insulin sensitivity.' },
      { original: 'No binding flour used in original', swapped: '1 tbsp almond flour (optional addition)', reason: 'Almond flour adds a small amount of protein and fiber, which helps slow glucose absorption and improves the overall glycemic profile of the bar without changing the flavor or texture noticeably.' },
    ],
    whyTheseSwaps: "The original Cherry Bounty Bars are a beautiful no-bake treat — and the great news is that their base is already quite insulin-friendly! Coconut is naturally lower in sugar and higher in fiber and healthy fats, which means it digests more slowly than many other sweets. The key changes here target the sugar sources: swapping added sweeteners (like maple syrup or icing sugar) for zero-glycemic monk fruit or erythritol eliminates the blood sugar spike while keeping the bars sweet and satisfying. Moving to 85–90% dark chocolate dramatically reduces the sugar in the coating, which is often the biggest glycemic culprit in chocolate-covered bars. The cherry swap — freeze-dried unsweetened plus fresh tart cherries — keeps that signature cherry flavor front and center without the sugar load of sweetened cherries. Tart cherries in particular are a wonderful choice for insulin resistance because they are lower in fructose than sweet cherries and contain natural compounds that may support metabolic health. The optional almond flour is a small but smart addition: it adds fiber and a little protein to further blunt any glucose response. As always, portion size matters even with healthier ingredients, so enjoying one or two bars as a treat alongside a balanced meal or snack is a great approach. Please consult your doctor or a registered dietitian before making significant dietary changes, especially when managing insulin resistance, as individual needs vary and personalized guidance is always best.",
    macrosBefore: { fat: 13, carbs: 22, fiber: 3, protein: 2 },
    macrosAfter: { fat: 13, carbs: 10, fiber: 4, protein: 3 },
    seoTitle: 'Insulin-Friendly Cherry Bounty Bars — No-Bake, Vegan | Old2New',
    metaDescription: 'See how Old2New transforms classic Cherry Bounty Bars into a no-bake, vegan, insulin-friendly version — a real recipe transformation from Old2New.',
    canonicalUrl: `${SITE_URL}/recipes/insulin-friendly-cherry-bounty-bars`,
    datePublished: '2026-07-21',
    dateModified: '2026-07-21',
  },
  {
    // source: saved_recipes.id 0fc505af-28d0-4600-b360-f260bfdbd101
    slug: 'insulin-friendly-spiced-chicken-thighs-with-cauliflower-rice',
    title: 'Insulin-Friendly Spiced Chicken Thighs with Cauliflower Rice',
    originalTitle: 'Spiced Chicken Thighs with Cauliflower Rice',
    originalRecipeUrl: null,
    healthGoals: ['Insulin-Friendly'],
    healthGoal: 'Insulin-Friendly',
    summary: 'You are already choosing one of the most powerful tools for managing insulin resistance — real, whole food cooked at home. This dish is flavorful, satisfying, and genuinely working with your body, not against it. Keep going — every meal like this is a win!',
    heroImage: 'https://hjtwpyauadgfhdurbmdr.supabase.co/storage/v1/object/public/recipe-images/ad8541ac-a6e1-4ccd-aba1-aa970fcbfae4.png',
    heroImageAlt: 'A crispy-skinned spiced chicken thigh served over turmeric cauliflower rice with peas, garnished with parsley and a lemon wedge',
    servings: 4,
    prepTime: '15 mins',
    cookTime: '35 mins',
    caloriesBefore: 520,
    caloriesAfter: 390,
    ingredients: [
      { item: 'bone-in, skin-on chicken thighs', amount: '4', note: 'skin kept on for crispiness; trim excess fat' },
      { item: 'ground turmeric', amount: '1 tsp', note: 'anti-inflammatory spice, great for insulin sensitivity' },
      { item: 'ground cumin', amount: '1 tsp', note: '' },
      { item: 'smoked paprika', amount: '1 tsp', note: '' },
      { item: 'ground cinnamon', amount: '1/2 tsp', note: 'helps regulate blood sugar' },
      { item: 'ground ginger', amount: '1/2 tsp', note: '' },
      { item: 'garlic powder', amount: '1/2 tsp', note: '' },
      { item: 'sea salt', amount: '1/2 tsp', note: '' },
      { item: 'black pepper', amount: '1/4 tsp', note: 'enhances turmeric absorption' },
      { item: 'avocado oil', amount: '1 tbsp', note: 'swap from vegetable oil; high smoke point, heart-healthy fat' },
      { item: 'cauliflower, riced', amount: '1 large head', note: 'low-glycemic base; swap from white rice' },
      { item: 'fresh ginger, grated', amount: '1 tbsp', note: 'supports insulin sensitivity' },
      { item: 'garlic, minced', amount: '3 cloves', note: '' },
      { item: 'yellow onion, finely diced', amount: '1/2 cup', note: '' },
      { item: 'frozen peas', amount: '1/2 cup', note: 'adds fiber and plant protein to slow glucose absorption' },
      { item: 'avocado oil', amount: '1 tbsp', note: 'for cauliflower rice sauté' },
      { item: 'fresh parsley or cilantro, chopped', amount: '2 tbsp', note: 'for garnish' },
      { item: 'lemon, juiced', amount: '1', note: 'brightens flavor without added sugar' },
      { item: 'apple cider vinegar', amount: '1 tbsp', note: 'may help blunt post-meal blood sugar spikes' },
    ],
    ingredientNotes: [],
    instructions: [
      'Preheat your oven to 425°F (220°C). Line a baking sheet with parchment paper or use an oven-safe skillet.',
      'In a small bowl, mix turmeric, cumin, smoked paprika, cinnamon, ginger, garlic powder, salt, and black pepper.',
      'Pat chicken thighs completely dry with paper towels — this is the secret to crispy skin. Rub avocado oil over the thighs, then coat generously with the spice mixture on all sides.',
      'Place chicken thighs skin-side up on the prepared baking sheet. Roast for 30–35 minutes until skin is deeply golden and internal temperature reaches 165°F (74°C). For extra crispiness, broil the last 3 minutes.',
      'While chicken roasts, heat 1 tbsp avocado oil in a large skillet over medium heat. Add diced onion and cook for 3–4 minutes until softened.',
      'Add minced garlic and fresh grated ginger to the skillet. Sauté for 1 minute until fragrant.',
      'Add riced cauliflower to the skillet. Stir to coat and cook for 5–7 minutes, stirring occasionally, until tender but not mushy.',
      'Stir in frozen peas and apple cider vinegar. Cook for another 2 minutes. Season with salt and pepper to taste.',
      'Remove from heat, squeeze fresh lemon juice over the cauliflower rice, and toss with fresh herbs.',
      'Plate the cauliflower rice pilaf and top with one crispy chicken thigh per serving. Serve immediately and enjoy!',
    ],
    swaps: [
      { original: 'Vegetable or neutral cooking oil', swapped: 'Avocado oil', reason: 'Avocado oil is rich in monounsaturated fats which support insulin sensitivity and has a high smoke point ideal for roasting.' },
      { original: 'Standard spice blend without cinnamon', swapped: 'Spice blend including cinnamon and black pepper', reason: 'Cinnamon is well-studied for its potential to improve insulin sensitivity and reduce fasting blood sugar. Black pepper enhances turmeric bioavailability.' },
      { original: 'White rice (if originally included as a pilaf base)', swapped: 'Cauliflower rice (already present, optimized)', reason: 'Cauliflower rice has minimal digestible carbohydrates and a very low glycemic index, making it ideal for managing blood sugar spikes.' },
      { original: 'No acidic component', swapped: 'Apple cider vinegar + lemon juice', reason: 'Apple cider vinegar has been shown in studies to help blunt post-meal blood sugar rises. Lemon adds brightness without sugar.' },
      { original: 'Plain peas omitted', swapped: 'Frozen peas added', reason: 'Peas add fiber and plant protein which slow glucose absorption and improve satiety without significantly raising blood sugar.' },
      { original: 'Fresh ginger (dried only)', swapped: 'Fresh grated ginger', reason: 'Fresh ginger contains active compounds (gingerols) that may improve insulin sensitivity and reduce inflammation.' },
    ],
    whyTheseSwaps: "This recipe was already a great starting point for insulin resistance — cauliflower rice is a fantastic low-glycemic swap and the spiced chicken is naturally low in processed carbohydrates. We've fine-tuned it by amplifying the insulin-friendly power of the spice blend (adding cinnamon and boosting turmeric with black pepper), swapping to avocado oil for its healthy fat profile, and adding apple cider vinegar which research suggests may help reduce post-meal blood sugar spikes. Fiber from peas and the cauliflower itself helps slow glucose absorption, keeping your blood sugar steadier throughout the meal. The goal here is not just to minimize carbs but to maximize the nutrient density of every bite — lean protein, healthy fats, fiber, and functional spices all working together to support your metabolic health. As always, please consult your doctor or a registered dietitian before making significant dietary changes, especially when managing a condition like insulin resistance.",
    macrosBefore: { fat: 34, carbs: 18, fiber: 3, protein: 32 },
    macrosAfter: { fat: 22, carbs: 14, fiber: 6, protein: 34 },
    seoTitle: 'Insulin-Friendly Spiced Chicken Thighs with Cauliflower Rice | Old2New',
    metaDescription: 'See how Old2New transforms spiced chicken thighs into an insulin-friendly dinner with turmeric cauliflower rice — a real recipe transformation from Old2New.',
    canonicalUrl: `${SITE_URL}/recipes/insulin-friendly-spiced-chicken-thighs-with-cauliflower-rice`,
    datePublished: '2026-07-20',
    dateModified: '2026-07-21',
  },
  {
    // source: saved_recipes.id e62eaf33-2fd6-4160-90ba-cd2d56e66ff9
    // Real saved title: "GLP-1 Friendly High-Protein Keto Mediterranean Diet Pizza"
    // Displayed publicly as "Lighter Protein Pizza" (shorter, consumer-friendly)
    // per explicit direction — all other fields are the unmodified real transformation.
    slug: 'lighter-protein-pizza',
    title: 'Lighter Protein Pizza',
    originalTitle: 'Pizza',
    originalRecipeUrl: null,
    healthGoals: ['GLP-1 Friendly', 'High Protein', 'Keto', 'Mediterranean'],
    healthGoal: 'High Protein',
    summary: "You didn't give up pizza — you just gave it a serious upgrade! Every slice of this version is working for your goals, not against them, and it still delivers all the comfort of pizza night.",
    heroImage: 'https://hjtwpyauadgfhdurbmdr.supabase.co/storage/v1/object/public/recipe-images/e26a0d00-c576-40f5-8714-5eabb6e53a0f.png',
    heroImageAlt: 'A sliced high-protein pizza with a thin crust topped with grilled chicken, spinach, roasted red peppers, olives, and cherry tomatoes',
    servings: 4,
    prepTime: '20 mins',
    cookTime: '25 mins',
    caloriesBefore: 680,
    caloriesAfter: 390,
    ingredients: [
      { item: 'shredded mozzarella cheese (part-skim)', amount: '1 1/2 cups', note: 'base of fathead-style keto crust' },
      { item: 'cream cheese (reduced-fat)', amount: '2 oz', note: 'swap for full-fat; keeps crust lower calorie' },
      { item: 'egg', amount: '1 large', note: 'binds the crust and adds protein' },
      { item: 'almond flour (blanched, fine)', amount: '3/4 cup', note: 'swap for white flour; keto-friendly, lower carb' },
      { item: 'garlic powder', amount: '1 tsp', note: '' },
      { item: 'dried oregano', amount: '1 tsp', note: '' },
      { item: 'dried basil', amount: '1/2 tsp', note: '' },
      { item: 'low-sodium crushed tomatoes', amount: '1/2 cup', note: 'swap for processed pizza sauce; less sugar and sodium' },
      { item: 'extra virgin olive oil', amount: '1 tbsp', note: 'swap for vegetable or seed oils; Mediterranean Diet staple' },
      { item: 'garlic, minced', amount: '2 cloves', note: '' },
      { item: 'red pepper flakes', amount: '1/2 tsp', note: 'optional, for flavor without extra calories' },
      { item: 'grilled chicken breast, thinly sliced', amount: '4 oz', note: 'swap for processed pepperoni or sausage; lean high-protein topping' },
      { item: 'part-skim shredded mozzarella (for topping)', amount: '1/2 cup', note: 'reduced amount to lower saturated fat' },
      { item: 'baby spinach, fresh', amount: '1/2 cup', note: 'added for fiber and micronutrients' },
      { item: 'roasted red peppers, sliced (no added oil)', amount: '1/3 cup', note: 'added for color, antioxidants, and flavor' },
      { item: 'black olives, sliced', amount: '1/4 cup', note: 'healthy fat source; Mediterranean-style topping' },
      { item: 'cherry tomatoes, halved', amount: '1/4 cup', note: 'fresh, low-carb vegetable topping' },
      { item: 'fresh basil leaves', amount: '2 tbsp', note: 'added after baking for fresh flavor' },
    ],
    ingredientNotes: [],
    instructions: [
      'Preheat your oven to 425°F (220°C). Line a baking sheet or pizza pan with parchment paper.',
      'In a microwave-safe bowl, combine 1 1/2 cups part-skim mozzarella and reduced-fat cream cheese. Microwave in 30-second intervals, stirring between each, until fully melted and smooth (about 60–90 seconds total).',
      'Let the cheese mixture cool for 2 minutes, then add the egg, almond flour, garlic powder, oregano, and basil. Mix vigorously until a uniform dough forms. If the dough is too sticky, wet your hands lightly.',
      'Transfer the dough to the parchment-lined pan and press it out into a thin, even 10–12 inch circle or rectangle using your hands or a rolling pin covered with parchment paper.',
      'Bake the crust for 10–12 minutes until lightly golden and set. Watch carefully to prevent over-browning on the edges.',
      'While the crust bakes, stir together the crushed tomatoes, 1 tbsp olive oil, minced garlic, and red pepper flakes in a small bowl to make the sauce.',
      'Remove the crust from the oven. Spread the tomato-olive oil sauce evenly over the crust, leaving a 1/2-inch border.',
      'Distribute the grilled chicken slices evenly over the sauce, followed by the spinach, roasted red peppers, black olives, and cherry tomatoes.',
      'Sprinkle the remaining 1/2 cup part-skim mozzarella evenly over all the toppings.',
      'Return the pizza to the oven and bake for an additional 10–12 minutes until the cheese is melted and bubbly and the edges are golden brown.',
      'Remove from the oven and let rest for 3–4 minutes before slicing. Top with fresh basil leaves before serving.',
      'Slice into 8 pieces (2 slices per serving) and serve immediately.',
    ],
    swaps: [
      { original: 'White flour pizza crust', swapped: 'Almond flour fathead keto crust', reason: 'Eliminates high-carb white flour; almond flour is low-carb and keto-compatible while keeping the pizza form intact' },
      { original: 'Vegetable or seed oil in dough', swapped: 'Extra virgin olive oil in sauce', reason: 'EVOO is a cornerstone of the Mediterranean Diet, providing heart-healthy monounsaturated fats' },
      { original: 'Full-fat cream cheese', swapped: 'Reduced-fat cream cheese', reason: 'Lowers saturated fat and total calories while maintaining crust texture' },
      { original: 'Processed pizza sauce (high sugar, high sodium)', swapped: 'Low-sodium crushed tomatoes with garlic and olive oil', reason: 'Reduces added sugar and sodium; more aligned with Mediterranean whole-food principles' },
      { original: 'Pepperoni or Italian sausage', swapped: 'Grilled chicken breast', reason: 'Dramatically increases lean protein content; removes processed meat and saturated fat — key for GLP-1, High Protein, and Mediterranean goals' },
      { original: 'Full-fat mozzarella in large amounts', swapped: 'Part-skim mozzarella in reduced quantity', reason: 'Lowers saturated fat and total calories while preserving the classic melted cheese experience' },
      { original: 'No vegetables', swapped: 'Spinach, roasted red peppers, cherry tomatoes, black olives', reason: 'Adds fiber (GLP-1 friendly for satiety and blood sugar), antioxidants, and heart-healthy fats from olives' },
    ],
    whyTheseSwaps: "This transformation keeps your pizza as pizza — same satisfying hand-held slices, melted cheese, savory sauce, and hearty toppings — while rebuilding it from the crust up for four powerful diet goals at once. The fathead almond flour crust slashes carbs dramatically to support Keto, while keeping the crust crispy and satisfying. Grilled chicken and the egg-and-cheese crust base work together to push protein higher for your High Protein goal. Extra virgin olive oil in the sauce, vegetable toppings, reduced saturated fat, and the move away from processed meats all align closely with the Mediterranean Diet's nutritional framework — emphasizing whole foods, healthy fats, and lean proteins. For GLP-1 compatibility, we focused on high protein, added fiber from vegetables, reduced ultra-processed ingredients, and kept portions moderate and nutrient-dense to support satiety and stable blood sugar. The result is a pizza that genuinely satisfies a pizza craving while being far kinder to your health goals. As always, please consult your doctor or a registered dietitian before making significant dietary changes, especially if you are managing a health condition or are on GLP-1 medication.",
    macrosBefore: { fat: 30, carbs: 72, fiber: 3, protein: 24 },
    macrosAfter: { fat: 24, carbs: 12, fiber: 5, protein: 36 },
    seoTitle: 'Lighter Protein Pizza — GLP-1, Keto & Mediterranean Friendly | Old2New',
    metaDescription: 'See how Old2New transforms classic pizza into a lighter, higher-protein version — a real GLP-1 Friendly, Keto, and Mediterranean recipe transformation from Old2New.',
    canonicalUrl: `${SITE_URL}/recipes/lighter-protein-pizza`,
    datePublished: '2026-07-08',
    dateModified: '2026-07-21',
  },
  {
    // source: saved_recipes.id 8f497301-2185-4eac-a27e-2976a4305e12
    slug: 'anti-inflammatory-turmeric-honey-roasted-nuts',
    title: 'Anti-Inflammatory Turmeric Honey Roasted Nuts',
    originalTitle: 'Sriracha Honey Roasted Nuts',
    originalRecipeUrl: null,
    healthGoals: ['Anti-Inflammatory'],
    healthGoal: 'Anti-Inflammatory',
    summary: "Snacking smart is one of the easiest wins in an anti-inflammatory lifestyle, and this recipe proves healthy food doesn't have to be boring — it can be bold, crunchy, and totally crave-worthy. You're not giving anything up here; you're leveling up!",
    heroImage: 'https://hjtwpyauadgfhdurbmdr.supabase.co/storage/v1/object/public/recipe-images/e460f8af-0894-4caf-b8ae-7b8e4d391bd6.png',
    heroImageAlt: 'A wooden bowl of golden turmeric honey roasted mixed nuts and seeds with a warm amber spiced glaze',
    servings: 8,
    prepTime: '10 mins',
    cookTime: '20 mins',
    caloriesBefore: 210,
    caloriesAfter: 180,
    ingredients: [
      { item: 'raw mixed nuts (walnuts, almonds, pecans, cashews)', amount: '2 cups', note: 'walnuts and almonds are especially high in anti-inflammatory omega-3s and vitamin E' },
      { item: 'raw honey', amount: '2 tablespoons', note: 'use raw honey for trace antioxidants; reduce amount from original for lower sugar' },
      { item: 'extra virgin olive oil', amount: '1 tablespoon', note: 'swap from any neutral vegetable oil — rich in anti-inflammatory oleocanthal' },
      { item: 'ground turmeric', amount: '1 teaspoon', note: 'powerful anti-inflammatory curcumin source' },
      { item: 'ground ginger', amount: '1/2 teaspoon', note: 'anti-inflammatory companion to turmeric' },
      { item: 'black pepper', amount: '1/4 teaspoon', note: 'enhances curcumin absorption by up to 2000%' },
      { item: 'cayenne pepper', amount: '1/2 teaspoon', note: 'swap from sriracha — provides heat without added sugar, sodium, or preservatives' },
      { item: 'cinnamon', amount: '1/2 teaspoon', note: 'adds warmth and helps regulate blood sugar response' },
      { item: 'fine sea salt', amount: '1/2 teaspoon', note: 'reduced from typical snack recipes' },
      { item: 'raw pumpkin seeds (pepitas)', amount: '1 tablespoon', note: 'added for extra magnesium and anti-inflammatory zinc' },
      { item: 'raw sunflower seeds', amount: '1 tablespoon', note: 'added for vitamin E boost' },
    ],
    ingredientNotes: [],
    instructions: [
      'Preheat your oven to 325°F (165°C). Line a baking sheet with parchment paper.',
      'In a large mixing bowl, whisk together the raw honey, extra virgin olive oil, turmeric, ginger, black pepper, cayenne pepper, cinnamon, and sea salt until well combined.',
      'Add the mixed nuts, pumpkin seeds, and sunflower seeds to the bowl. Toss thoroughly until every nut and seed is evenly coated with the spice mixture.',
      'Spread the coated nuts in a single, even layer on the prepared baking sheet. Make sure they are not overlapping for even roasting.',
      'Roast in the preheated oven for 18 to 20 minutes, stirring gently halfway through at the 10-minute mark to ensure even toasting and prevent burning.',
      'Remove from the oven when the nuts are golden and fragrant. They will appear slightly soft when hot but will crisp up as they cool.',
      'Allow the nuts to cool completely on the baking sheet — at least 15 minutes — before breaking apart any clusters and transferring to an airtight container.',
      'Store in an airtight container at room temperature for up to one week, or refrigerate for up to three weeks.',
    ],
    swaps: [
      { original: 'Sriracha sauce', swapped: 'Cayenne pepper', reason: 'Sriracha contains added sugars, sodium, and preservatives that can contribute to inflammation. Pure cayenne delivers clean heat with capsaicin, which has anti-inflammatory properties.' },
      { original: 'Neutral vegetable oil or butter', swapped: 'Extra virgin olive oil', reason: 'Refined vegetable oils are high in omega-6 fatty acids which promote inflammation. Extra virgin olive oil is rich in oleocanthal, a natural anti-inflammatory compound similar in action to ibuprofen.' },
      { original: 'Standard honey (processed)', swapped: 'Raw honey', reason: 'Raw honey retains trace antioxidants, enzymes, and anti-inflammatory polyphenols that are destroyed during commercial processing.' },
      { original: 'No spice base beyond sriracha', swapped: 'Turmeric, ginger, black pepper, cinnamon', reason: "This quartet is the gold standard of anti-inflammatory spicing. Turmeric's curcumin, ginger's gingerols, cinnamon's cinnamaldehyde, and black pepper's piperine (which boosts curcumin absorption) all actively support the body's inflammation response." },
      { original: 'Mixed nuts only', swapped: 'Mixed nuts plus pumpkin seeds and sunflower seeds', reason: 'Adding seeds boosts magnesium, zinc, and vitamin E content — key micronutrients that support anti-inflammatory pathways.' },
      { original: 'Peanuts or heavily salted nuts', swapped: 'Walnuts, almonds, pecans, cashews', reason: 'Walnuts are particularly high in ALA omega-3 fatty acids. Almonds and pecans are rich in vitamin E and polyphenols. These nuts have the strongest anti-inflammatory research backing.' },
    ],
    whyTheseSwaps: "The original Sriracha Honey Roasted Nuts are already a satisfying, crunchy snack — and this transformation keeps every bit of that sweet-spicy-crunchy magic while rebuilding the recipe around ingredients that actively work to calm inflammation rather than provoke it. The biggest shift is swapping sriracha (which contains added sugars, sodium, and preservatives) for pure cayenne pepper, which delivers the same heat with the bonus of capsaicin — a compound with well-documented anti-inflammatory effects. The spice blend of turmeric, ginger, black pepper, and cinnamon is essentially nature's anti-inflammatory pharmacy in a shaker jar, and together they make these nuts taste complex, warm, and deeply satisfying. Olive oil replaces any refined oils, raw honey replaces processed honey, and the addition of walnuts and seeds amplifies the omega-3 and vitamin E content considerably. The result is a snack that feels indulgent but is actively supportive of your health goals. As always, please consult your doctor or a registered dietitian before making significant dietary changes, especially if you are managing a specific inflammatory condition or taking medications.",
    macrosBefore: { fat: 16, carbs: 14, fiber: 2, protein: 5 },
    macrosAfter: { fat: 15, carbs: 10, fiber: 3, protein: 6 },
    seoTitle: 'Anti-Inflammatory Turmeric Honey Roasted Nuts | Old2New',
    metaDescription: 'See how Old2New transforms Sriracha honey roasted nuts into an anti-inflammatory turmeric version — a real recipe transformation from Old2New.',
    canonicalUrl: `${SITE_URL}/recipes/anti-inflammatory-turmeric-honey-roasted-nuts`,
    datePublished: '2026-07-20',
    dateModified: '2026-07-21',
  },
]

export function getPublicRecipeBySlug(slug) {
  return PUBLIC_RECIPES.find(r => r.slug === slug) || null
}

// Kept for forward-compatibility: if a future recipe record is added before
// its full content is ready, the shared components render an honest
// "being finalized" state instead of guessing at content. None of the 4
// current records use this — every field above is real.
export function isPlaceholder(value) {
  return value === 'TODO: needs real data from Old2New'
}
