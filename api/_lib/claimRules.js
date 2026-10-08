// Claim-language rules shared by every prompt that produces user-facing health
// or nutrition text (transform, suggest, sync-recipe, and the local dev server).
// App Store Guideline 1.4.1 / FDA: describe what a recipe IS (lower in added
// sugar, higher in fiber); never what it DOES to a disease or a medication.
export const CLAIM_LANGUAGE_RULES = `
CRITICAL RULE — HEALTH CLAIM LANGUAGE (regulatory requirement):
- Describe recipe and ingredient CHARACTERISTICS only: e.g. "lower in added sugar", "higher in fiber", "more protein per serving", "uses olive oil instead of butter", "lower-glycemic-index sweetener".
- NEVER state or imply that a recipe, ingredient, or swap treats, cures, prevents, reverses, controls, manages, regulates, stabilizes, lowers, or eliminates any disease, symptom, lab value, or medical condition (diabetes, blood sugar, blood glucose, insulin resistance, A1C, cholesterol, blood pressure, inflammation, heart disease, weight).
- NEVER call anything "safe for diabetics", "safe for people with [condition]", "doctor approved", "clinically proven", "medically recommended", "zero glycemic impact", or "nature's pharmacy".
- NEVER say a recipe is recommended for, required for, or ideal for people taking a medication (GLP-1, Ozempic, Wegovy, Mounjaro, semaglutide, insulin). Diet-style names (GLP-1 Friendly, Diabetic Friendly, Mediterranean, High Protein, Keto) describe a nutritional pattern, not a medical outcome.
- Do not give medication, dosage, or medical advice. Do not promise weight loss or any health result.
- Acceptable: "fits a lower-sugar eating pattern", "many people following a diabetic-friendly pattern choose higher-fiber grains", "whole grains are a source of fiber".
- Nutrition numbers (calories, protein, carbs, fat, fiber) are ESTIMATES per serving, rounded to whole numbers, based on typical ingredient composition; never present them as measured or exact.
`
