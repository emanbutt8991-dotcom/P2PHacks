/*
  Schematic sourcing network for the Company Profile step.
  Built ONLY from questionnaire answers: main region, share from that region,
  supplier concentration and lead time. Supplier nodes are abstract — they
  represent the concentration answer, not real supplier locations.
*/
import { useId } from 'react'
import { REGIONS, REGION_SHARES, labelOf } from '../../data/demoData.js'

const SUPPLIER_COUNT = { single: 1, few: 3, diversified: 5 }

export default function SourcingNetwork({ answers, leadTimeDays }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const n = SUPPLIER_COUNT[answers.supplierConcentration] ?? 1
  const region = labelOf(REGIONS, answers.sourcingRegion)
  const share = labelOf(REGION_SHARES, answers.regionShare)
  const showOther = answers.regionShare !== 'gt80'
  const you = { x: 470, y: 110 }

  // Spread supplier nodes vertically around the region cluster
  const suppliers = Array.from({ length: n }, (_, i) => ({
    x: 120 + (n > 1 ? (i % 2) * 26 : 0),
    y: n === 1 ? 110 : 52 + (i * 116) / (n - 1),
  }))

  return (
    <figure className="m-0">
      <svg viewBox="0 0 560 220" className="mx-auto h-auto w-full max-w-2xl" role="img" aria-label={`Schematic: ${n === 1 ? 'one main supplier' : `${n} supplier nodes`} in ${region} supplying your business, about ${leadTimeDays} days lead time.`}>
        <defs>
          <linearGradient id={`ln${uid}`} x1="0" x2="1">
            <stop offset="0" stopColor="#14b8a6" />
            <stop offset="1" stopColor="#176b9a" />
          </linearGradient>
        </defs>
        <rect width="560" height="220" rx="20" fill="#071b30" />
        {/* region cluster */}
        <rect x="40" y="22" width="190" height="176" rx="16" fill="rgba(94,234,212,.06)" stroke="rgba(94,234,212,.25)" strokeDasharray="4 5" />
        <text x="56" y="44" fill="#5eead4" fontSize="12" fontWeight="700" letterSpacing=".06em">
          {region.toUpperCase()}
        </text>
        <text x="56" y="188" fill="#94a3b8" fontSize="11">
          {share} of imports
        </text>

        {suppliers.map((s, i) => {
          const mx = (s.x + you.x) / 2
          const d = `M${s.x} ${s.y} C${mx} ${s.y} ${mx} ${you.y} ${you.x} ${you.y}`
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={`url(#ln${uid})`} strokeOpacity=".35" strokeWidth={n === 1 ? 6 : 2.5} />
              <path d={d} fill="none" stroke="#5eead4" strokeWidth={n === 1 ? 2.5 : 1.5} className="route-flow" />
              <circle cx={s.x} cy={s.y} r={n === 1 ? 11 : 8} fill="#e8f0f4" stroke="#14b8a6" strokeWidth="2.5" />
            </g>
          )
        })}

        {showOther && (
          <g>
            <path d={`M300 196 C390 196 400 ${you.y} ${you.x} ${you.y}`} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 5" />
            <text x="250" y="200" fill="#94a3b8" fontSize="11">
              Other regions
            </text>
          </g>
        )}

        {/* lead time label */}
        <g transform="translate(330 70)">
          <rect x="-46" y="-14" width="92" height="24" rx="12" fill="#102a43" stroke="rgba(94,234,212,.3)" />
          <text textAnchor="middle" y="3" fill="#f5fafc" fontSize="11.5" fontWeight="600">
            ~{leadTimeDays} days
          </text>
        </g>

        {/* your business */}
        <circle cx={you.x} cy={you.y} r="26" fill="#f4b860" className="node-pulse" />
        <circle cx={you.x} cy={you.y} r="20" fill="#f4b860" stroke="#071b30" strokeWidth="3" />
        <text x={you.x} y={you.y + 46} textAnchor="middle" fill="#f5fafc" fontSize="12" fontWeight="700">
          Your business
        </text>
      </svg>
      <figcaption className="mt-2 text-xs text-slate-500">
        Schematic only: supplier nodes reflect your concentration answer, not real supplier locations.
      </figcaption>
    </figure>
  )
}
