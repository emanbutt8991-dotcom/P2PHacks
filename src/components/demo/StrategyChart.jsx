import { money, moneyCompact } from '../../utils/format.js'

export const COMPONENT_META = [
  { key: 'freight', label: 'Freight change', color: 'bg-brand-700' },
  { key: 'tariff', label: 'Hypothetical tariff', color: 'bg-teal' },
  { key: 'delay', label: 'Delay shortfall', color: 'bg-amber-400' },
  { key: 'response', label: 'Response cost', color: 'bg-slate-400' },
]

/*
  Lightweight stacked horizontal bars (plain CSS, no chart library).
  Positive components stack right of zero; negative ones (e.g. freight savings
  on a shorter lane) stack left of zero.
*/
export default function StrategyChart({ strategies, lowestCostId, compact = false }) {
  const sums = strategies.map((s) => {
    const vals = Object.values(s.components)
    return {
      pos: vals.filter((v) => v > 0).reduce((a, b) => a + b, 0),
      neg: vals.filter((v) => v < 0).reduce((a, b) => a + b, 0),
    }
  })
  const maxPos = Math.max(1, ...sums.map((s) => s.pos))
  const maxNeg = Math.abs(Math.min(0, ...sums.map((s) => s.neg)))
  const range = maxPos + maxNeg
  const zero = (maxNeg / range) * 100

  return (
    <div>
      <ul className={compact ? 'space-y-2.5' : 'space-y-4'}>
        {strategies.map((s) => {
          let posOffset = zero
          let negOffset = zero
          return (
            <li key={s.id}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className={`min-w-0 font-medium ${compact ? 'text-xs text-slate-600' : 'text-slate-800'}`}>
                  {s.name}
                  {!compact && s.id === lowestCostId && (
                    <span className="ml-2 inline-block text-xs font-semibold whitespace-nowrap text-emerald-700">Lowest est. cost</span>
                  )}
                </span>
                <span className={`shrink-0 font-semibold tabular-nums text-slate-900 ${compact ? 'text-xs' : ''}`}>
                  {compact ? moneyCompact(s.total) : money(s.total)}
                </span>
              </div>
              <div
                className={`relative mt-1 w-full overflow-hidden rounded-md bg-slate-100 ${compact ? 'h-2.5' : 'h-4'}`}
                role="img"
                aria-label={`${s.name}: estimated additional cost ${money(s.total)}. ${COMPONENT_META.map(
                  (m) => `${m.label} ${money(s.components[m.key])}`,
                ).join(', ')}.`}
              >
                {COMPONENT_META.map((m) => {
                  const v = s.components[m.key]
                  if (!v) return null
                  const w = (Math.abs(v) / range) * 100
                  let left
                  if (v > 0) {
                    left = posOffset
                    posOffset += w
                  } else {
                    negOffset -= w
                    left = negOffset
                  }
                  return (
                    <span
                      key={m.key}
                      className={`absolute inset-y-0 ${m.color} ${v < 0 ? 'opacity-50' : ''} transition-[left,width] duration-300`}
                      style={{ left: `${left}%`, width: `${w}%` }}
                    />
                  )
                })}
                {maxNeg > 0 && <span className="absolute inset-y-0 w-px bg-slate-500" style={{ left: `${zero}%` }} />}
              </div>
            </li>
          )
        })}
      </ul>
      {!compact && (
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Chart legend">
          {COMPONENT_META.map((m) => (
            <li key={m.key} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${m.color}`} aria-hidden="true" />
              {m.label}
            </li>
          ))}
          {maxNeg > 0 && <li className="text-slate-500">Faded segments left of the line are savings.</li>}
        </ul>
      )}
    </div>
  )
}
