/*
  Visualises the selected disruption using the scenario's own numbers:
  normal lead time vs. the delayed order, with the part of the delay covered by
  the inventory buffer and the uncovered days. Purely presentational.
*/
export default function SupplyTimeline({ leadTimeDays, delayDays, bufferDays, uncoveredDays }) {
  const covered = Math.max(0, delayDays - uncoveredDays)
  const max = Math.max(leadTimeDays + delayDays, leadTimeDays + 30)
  const pct = (d) => `${(d / max) * 100}%`
  const bar = 'h-full transition-[width] duration-500 ease-out'

  return (
    <div>
      <div className="space-y-3 text-sm">
        <Row label="Normal order" days={leadTimeDays}>
          <span className={`${bar} rounded-l-md bg-gradient-to-r from-teal to-ocean`} style={{ width: pct(leadTimeDays) }} />
        </Row>
        <Row label="Delayed order" days={leadTimeDays + delayDays}>
          <span className={`${bar} rounded-l-md bg-gradient-to-r from-teal to-ocean`} style={{ width: pct(leadTimeDays) }} />
          <span
            className={`${bar} bg-[repeating-linear-gradient(135deg,rgba(20,184,166,.35)_0_6px,rgba(20,184,166,.15)_6px_12px)]`}
            style={{ width: pct(covered) }}
            title={`${covered} delay days covered by inventory`}
          />
          <span className={`${bar} bg-sun`} style={{ width: pct(uncoveredDays) }} title={`${uncoveredDays} uncovered days`} />
        </Row>
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-r from-teal to-ocean" aria-hidden="true" /> Lead time ({leadTimeDays} days)
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-teal/30" aria-hidden="true" /> Delay covered by buffer ({covered} of {bufferDays} days)
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-sun" aria-hidden="true" /> Uncovered ({uncoveredDays} days)
        </li>
      </ul>
    </div>
  )
}

function Row({ label, days, children }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-3">
      <span className="text-slate-600">{label}</span>
      <span className="flex h-3.5 overflow-hidden rounded-md bg-mist" role="img" aria-label={`${label}: ${days} days`}>
        {children}
      </span>
      <span className="text-right font-semibold text-navy tabular-nums">{days} days</span>
    </div>
  )
}
