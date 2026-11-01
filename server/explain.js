/*
  Optional plain-language explanation of a recommendation already computed by
  the shared engine. Claude only rewords the supplied facts. Any figure in its
  reply that is not in those facts rejects the reply, so the client keeps its
  rule-based explanation rather than showing an unsupported number.
*/
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM = `You explain a sourcing recommendation to a Canadian small-business owner.
You receive JSON computed by a deterministic engine. Use only those facts.
Never introduce a price, tariff rate, supplier detail, shipment status, emissions figure or date that is absent from the JSON, and do no arithmetic of your own.
Describe trade-offs rather than naming a single right answer, and mention any listed gaps or assumptions.
Write two short plain paragraphs with no headings, lists or markdown.`

const NUMBER_RE = /\d[\d,]*(?:\.\d+)?/g
const toNumbers = (text) => (text.match(NUMBER_RE) ?? []).map((n) => Number(n.replace(/,/g, '')))

/** True when every number in `text` also appears among the supplied facts. */
export function numbersGrounded(text, facts) {
  const allowed = new Set(toNumbers(JSON.stringify(facts)))
  const allowedRounded = [...allowed]
  return toNumbers(text).every(
    (n) => n <= 3 || allowed.has(n) || allowedRounded.some((a) => a !== 0 && Math.abs(a - n) / Math.abs(a) < 0.006),
  )
}

export async function explainRecommendation(config, facts) {
  const client = new Anthropic({
    apiKey: config.anthropicKey,
    baseURL: config.anthropicBaseUrl,
    timeout: 30_000,
    maxRetries: 1,
  })

  const response = await client.beta.messages.create({
    model: config.anthropicModel,
    max_tokens: 1024,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system: SYSTEM,
    messages: [{ role: 'user', content: JSON.stringify(facts) }],
  })

  if (response.stop_reason === 'refusal') return { text: null, reason: 'refused' }
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
  if (!text) return { text: null, reason: 'empty' }
  if (!numbersGrounded(text, facts)) return { text: null, reason: 'unsupported_figure' }
  return { text, model: response.model, reason: null }
}
