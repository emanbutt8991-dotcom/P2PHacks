// Illustrative keyword lookup for a product-classification STARTING POINT.
// This is not a classification and must be verified (e.g. with a licensed
// customs broker or official CBSA guidance) before any business use.
import { CLASSIFICATION_HINTS } from '../data/demoData.js'
import { isValidHsCode, normalizeHsCode } from './validation.js'

export function suggestChapter(description, hsCode = '') {
  const text = description.toLowerCase()
  const hint = CLASSIFICATION_HINTS.find((h) => h.keywords.some((k) => text.includes(k))) ?? null
  const userCode = hsCode && isValidHsCode(hsCode) ? normalizeHsCode(hsCode) : ''
  const userChapter = userCode ? userCode.slice(0, 2) : ''
  return {
    hint,
    userCode,
    userChapter,
    // Only meaningful when both a hint and a user code exist
    matches: Boolean(hint && userChapter && hint.chapter === userChapter),
  }
}
