// Simple validation for the questionnaire and newsletter.

// Accepts 6–10 digits, optionally separated by dots or spaces (e.g. 7323.93 or 7323.93.00.10).
export function normalizeHsCode(value) {
  return value.replace(/[.\s]/g, '')
}
export function isValidHsCode(value) {
  if (!value) return true // optional
  return /^[\d.\s]+$/.test(value) && /^\d{6,10}$/.test(normalizeHsCode(value))
}

export const QUESTIONNAIRE_STEPS = [
  { id: 'products', title: 'Products', fields: ['productCategory', 'productDescription', 'hsCode'] },
  { id: 'sourcing', title: 'Sourcing', fields: ['sourcingRegion', 'regionShare', 'supplierConcentration', 'leadTime', 'inventoryBuffer'] },
  { id: 'spending', title: 'Spending', fields: ['importSpend', 'freightSpend'] },
]

const REQUIRED = {
  productCategory: 'Choose a product category.',
  sourcingRegion: 'Choose your main sourcing region.',
  regionShare: 'Choose the approximate share from this region.',
  supplierConcentration: 'Choose how concentrated your suppliers are.',
  leadTime: 'Choose a typical lead time.',
  importSpend: 'Choose an approximate annual import spending range.',
  freightSpend: 'Choose an approximate annual freight spending range.',
}

/** Returns { field: message } for the given questionnaire step. */
export function validateStep(stepIndex, answers) {
  const errors = {}
  for (const field of QUESTIONNAIRE_STEPS[stepIndex].fields) {
    if (REQUIRED[field] && !answers[field]) errors[field] = REQUIRED[field]
  }
  if (stepIndex === 0 && !isValidHsCode(answers.hsCode)) {
    errors.hsCode = 'Enter 6–10 digits (dots allowed), or leave blank.'
  }
  if (stepIndex === 0 && answers.productDescription.length > 160) {
    errors.productDescription = 'Keep the description under 160 characters.'
  }
  return errors
}

export function isQuestionnaireComplete(answers) {
  return QUESTIONNAIRE_STEPS.every((_, i) => Object.keys(validateStep(i, answers)).length === 0)
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}
