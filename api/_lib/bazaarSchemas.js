// Bazaar-style input/output schema for the runtime 402 body's
// extensions.bazaar.schema, per api/_lib/x402.js send402(). Mirrors
// public/openapi.json's TransformRequest/TransformResponse schemas — kept
// separate because one is a static OpenAPI document and the other is
// generated at request time in the runtime challenge.

export const TRANSFORM_INPUT_SCHEMA = {
  type: 'object',
  required: ['recipe'],
  properties: {
    recipe: { type: 'string', minLength: 10, maxLength: 8000, description: 'The original recipe text to transform.' },
    diets: { type: 'array', items: { type: 'string', maxLength: 60 }, maxItems: 10, description: "Diet preferences, e.g. 'vegan', 'keto'. Provide diets and/or healthGoal." },
    healthGoal: { type: 'string', maxLength: 300, description: 'Free-text health goal or dietary preference. Provide diets and/or healthGoal.' },
    restrictions: {
      type: 'object',
      properties: {
        dairyFree: { type: 'boolean' },
        glutenFree: { type: 'boolean' },
        noNuts: { type: 'boolean', description: 'Life-threatening allergy — zero tolerance.' },
        noPork: { type: 'boolean' },
        vegan: { type: 'boolean' },
        custom: { type: 'string', maxLength: 200 },
      },
    },
  },
}

// Example request body for discovery crawlers (CDP Bazaar sends this as the
// unpaid probe input; it is also the `info.input.body` example agents copy).
export const TRANSFORM_INPUT_EXAMPLE = {
  recipe: 'Classic Beef Lasagna: 1 lb ground beef, 1 jar marinara sauce, 12 lasagna noodles, 16 oz ricotta cheese, 2 cups shredded mozzarella, 1 egg, 1/2 cup parmesan, salt and pepper to taste. Brown the beef, layer noodles with sauces and cheeses, bake at 375F for 45 minutes.',
  diets: ['vegan'],
  healthGoal: 'Lower saturated fat',
  restrictions: { vegan: true, dairyFree: true },
}

export const TRANSFORM_OUTPUT_EXAMPLE = {
  ok: true,
  schemaVersion: '1.0',
  requestId: '5b1e3e0a-2f3a-4c9e-8e2a-8e6f1a2b3c4d',
  model: 'claude-sonnet-4-6',
  restrictionsApplied: { vegan: true, dairyFree: true },
  result: {
    transformedRecipe: {
      name: 'Lentil Lasagna',
      ingredients: [{ amount: '2 cups', item: 'cooked green lentils', note: 'swapped for ground beef' }],
      instructions: ['Brown the lentils with onion and garlic.', 'Layer noodles with sauce and cashew ricotta.', 'Bake at 375F for 45 minutes.'],
    },
    shoppingList: { produce: ['onion', 'garlic'], protein: ['green lentils'], dairy: [], pantry: ['marinara sauce', 'lasagna noodles'], other: ['cashew ricotta'] },
  },
  disclaimer: 'Nutrition values are estimates, not measurements. This is not medical advice.',
}

export const TRANSFORM_IMAGE_OUTPUT_EXAMPLE = {
  ...TRANSFORM_OUTPUT_EXAMPLE,
  image: { imageUrl: 'https://hjtwpyauadgfhdurbmdr.supabase.co/storage/v1/object/public/recipe-images/example.png', imageModel: 'gpt-image-1' },
  disclaimer: TRANSFORM_OUTPUT_EXAMPLE.disclaimer + ' The image is an AI-generated illustration, not a photo of the actual prepared dish.',
}
