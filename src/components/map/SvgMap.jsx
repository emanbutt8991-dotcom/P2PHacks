// Fallback renderer for devices without WebGL. Same data, drawn with d3-geo.
import { useEffect, useMemo, useState } from 'react'
import { geoEquirectangular, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import worldUrl from 'world-atlas/countries-110m.json?url'
import { ALERT_COLOR, MODE_COLORS, NODE_STYLES } from './mapData.js'

const WIDTH = 960
const HEIGHT = 480
const hubRank = (node) => (node.kind === 'port' || node.kind === 'airport' ? 1 : 0)

export default function SvgMap({ data, onSelect, className, label }) {
  const [land, setLand] = useState(null)

  useEffect(() => {
    let live = true
    fetch(worldUrl)
      .then((r) => r.json())
      .then((topo) => live && setLand(feature(topo, topo.objects.land)))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  const projection = useMemo(() => geoEquirectangular().rotate([120, 0]).fitSize([WIDTH, HEIGHT], { type: 'Sphere' }), [])
  const path = useMemo(() => geoPath(projection), [projection])

  return (
    <div role="region" aria-label={label} className={`relative overflow-hidden rounded-xl bg-[#0a1230] ${className}`}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        {land && <path d={path(land)} fill="#1e2c5c" />}
        {data.segments.map((s) => (
          <path
            key={s.id}
            d={path({ type: 'LineString', coordinates: s.coords })}
            fill="none"
            stroke={s.affected || s.status === 'delayed' ? ALERT_COLOR : MODE_COLORS[s.mode]}
            strokeWidth={s.kind === 'lane' ? 1 : 2}
            strokeDasharray={s.kind === 'lane' ? '3 4' : undefined}
            onClick={() => s.shipmentId && onSelect?.({ type: 'shipment', id: s.shipmentId })}
          />
        ))}
        {/* Hubs first, so suppliers stay visible where they nearly overlap. */}
        {[...data.nodes].sort((a, b) => hubRank(b) - hubRank(a)).map((n) => {
          const [x, y] = projection([n.lon, n.lat])
          const style = NODE_STYLES[n.kind] ?? NODE_STYLES.supplier
          return (
            <g key={n.id} transform={`translate(${x} ${y})`} role="button" aria-label={n.label} onClick={() => onSelect?.({ type: 'node', node: n })} className="cursor-pointer">
              <circle r="8" fill={style.color} stroke={n.affected ? ALERT_COLOR : '#fff'} strokeWidth="1.5" />
              <text textAnchor="middle" dy="3.5" fontSize="9" fontWeight="700" fill="#fff">{style.glyph}</text>
            </g>
          )
        })}
      </svg>
      <p className="absolute bottom-1 left-2 text-[10px] text-slate-300">Simplified map: WebGL unavailable. Routes are schematic.</p>
    </div>
  )
}
