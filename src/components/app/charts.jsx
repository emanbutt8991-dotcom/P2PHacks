// Chart helpers. Thin bars, recessive axes, one scale, and a tooltip on every mark.
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCo2e } from '../../../shared/emissions.js'
import { MODE_COLORS } from '../map/mapData.js'

const ACCENT = '#8b7bff'
const axisTick = { fontSize: 11, fill: '#98a4cb' }

function ChartTooltip({ active, payload, label, format }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-semibold text-navy">{payload[0].payload.label ?? label}</p>
      <p className="text-slate-700 tabular-nums">{format(payload[0].value)}</p>
    </div>
  )
}

const shortKg = (kg) => (Math.abs(kg) >= 1000 ? `${(kg / 1000).toLocaleString('en-CA', { maximumFractionDigits: 1 })} t` : `${Math.round(kg)} kg`)

/** Horizontal bars for ranked categories. Bars carry direct value labels via the table beside them. */
export function RankedBars({ rows, format = formatCo2e, axisFormat = shortKg, height, colorOf, labelWidth = 130 }) {
  const data = rows.map((r) => ({ ...r, label: r.label ?? r.name }))
  return (
    <div style={{ height: height ?? Math.max(120, data.length * 34 + 28) }} role="img" aria-label={data.map((d) => `${d.label}: ${format(d.kg ?? d.value)}`).join('; ')}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }} barCategoryGap="28%">
          <CartesianGrid horizontal={false} stroke="#232e5b" />
          <XAxis type="number" tick={axisTick} tickFormatter={axisFormat} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={labelWidth} tick={axisTick} axisLine={false} tickLine={false} interval={0} />
          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<ChartTooltip format={format} />} />
          <Bar dataKey={rows[0]?.kg !== undefined ? 'kg' : 'value'} radius={[0, 4, 4, 0]} maxBarSize={14} fill={ACCENT} isAnimationActive={false}>
            {colorOf && data.map((d) => <Cell key={d.label} fill={colorOf(d)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Vertical bars over time. */
export function TimeBars({ rows, format = formatCo2e, height = 200 }) {
  return (
    <div style={{ height }} role="img" aria-label={rows.map((r) => `${r.name}: ${format(r.kg)}`).join('; ')}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barCategoryGap="32%">
          <CartesianGrid vertical={false} stroke="#232e5b" />
          <XAxis dataKey="name" tick={axisTick} axisLine={{ stroke: '#3a4a82' }} tickLine={false} />
          <YAxis tick={axisTick} tickFormatter={shortKg} axisLine={false} tickLine={false} width={52} />
          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<ChartTooltip format={format} />} />
          <Bar dataKey="kg" radius={[4, 4, 0, 0]} maxBarSize={36} fill={ACCENT} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export const modeColor = (row) => MODE_COLORS[row.mode] ?? ACCENT
