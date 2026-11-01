// Live preview of which figures the engine will use, shown beside the financial form.
import { resolveCompanyInputs } from '../../engine/finance.js'
import { FX_SNAPSHOT } from '../../data/fxSnapshot.js'
import { money } from '../../utils/format.js'

export function resolveInputsPreview(company, finance) {
  const ws = { company: { ...company, finance }, shipments: [] }
  const r = resolveCompanyInputs(ws, { totalSpendCad: 0, topCountryShare: 1, weightedLeadDays: null }, FX_SNAPSHOT)
  return {
    importText: money(r.importSpend),
    freightText: money(r.freightSpend),
    importKind: r.provenance.importSpend,
    freightKind: r.provenance.freightSpend,
  }
}
