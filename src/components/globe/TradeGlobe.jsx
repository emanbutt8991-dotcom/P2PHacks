/*
  Canvas trade globe (d3-geo orthographic projection).
  Land shapes: Natural Earth 1:110m via the `world-atlas` package (public domain
  data, ISC-licensed package) — no image or 3D-model assets are used.
  This module is lazy-loaded; see GlobeStage.jsx for the fallback.
*/
import { useEffect, useRef } from 'react'
import { geoDistance, geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import land110m from 'world-atlas/land-110m.json'
import { GLOBE } from '../../config/motion.js'
import { TRADE_ROUTES, HUBS } from './routes.js'

const land = feature(land110m, land110m.objects.land)
const graticule = geoGraticule10()

const MODE_STYLE = {
  sea: { stroke: 'rgba(94, 234, 212, 0.55)', marker: '#5eead4', dash: [] },
  air: { stroke: 'rgba(244, 184, 96, 0.55)', marker: '#f4b860', dash: [2, 5] },
  rail: { stroke: 'rgba(245, 250, 252, 0.45)', marker: '#f5fafc', dash: [6, 4] },
}

export default function TradeGlobe({ animate = true, className = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const projection = geoOrthographic().clipAngle(90).precision(0.6)
    const path = geoPath(projection, ctx)
    const routes = TRADE_ROUTES.map((r, i) => ({
      ...r,
      interp: geoInterpolate(r.from, r.to),
      line: { type: 'LineString', coordinates: Array.from({ length: 33 }, (_, k) => geoInterpolate(r.from, r.to)(k / 32)) },
      offset: (i * 0.37) % 1,
    }))

    let rotation = [...GLOBE.initialRotation]
    let size = 0
    let cssW = 0
    let cssH = 0
    let raf = 0
    let last = performance.now()
    let t = 0
    let visible = true
    let dragging = null

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      size = Math.max(1, Math.min(rect.width, rect.height))
      cssW = rect.width
      cssH = rect.height
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      projection.translate([rect.width / 2, rect.height / 2]).scale(size * 0.42)
      draw()
    }

    const draw = () => {
      const [cx, cy] = projection.translate()
      const r = projection.scale()
      ctx.clearRect(0, 0, cssW, cssH)
      projection.rotate([rotation[0], rotation[1], 0])
      const center = projection.invert([cx, cy])

      // Atmosphere glow
      const glow = ctx.createRadialGradient(cx, cy, r * 0.92, cx, cy, r * 1.22)
      glow.addColorStop(0, 'rgba(61, 127, 168, 0.24)')
      glow.addColorStop(0.45, 'rgba(116, 184, 216, 0.12)')
      glow.addColorStop(1, 'rgba(116, 184, 216, 0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(cx, cy, r * 1.22, 0, Math.PI * 2)
      ctx.fill()

      // Ocean sphere with light from upper-left
      const ocean = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.1, cx, cy, r)
      ocean.addColorStop(0, '#2b90c2')
      ocean.addColorStop(0.55, '#1a6896')
      ocean.addColorStop(1, '#0f3c60')
      ctx.fillStyle = ocean
      ctx.beginPath()
      path({ type: 'Sphere' })
      ctx.fill()

      // Graticule
      ctx.beginPath()
      path(graticule)
      ctx.strokeStyle = 'rgba(245, 250, 252, 0.08)'
      ctx.lineWidth = 0.6
      ctx.stroke()

      // Land
      ctx.beginPath()
      path(land)
      ctx.fillStyle = 'rgba(214, 241, 238, 0.9)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(16, 47, 76, 0.5)'
      ctx.lineWidth = 0.6
      ctx.stroke()

      // Terminator-style shading for depth
      const shade = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.2, cx, cy, r * 1.05)
      shade.addColorStop(0, 'rgba(10, 36, 62, 0)')
      shade.addColorStop(1, 'rgba(10, 36, 62, 0.42)')
      ctx.fillStyle = shade
      ctx.beginPath()
      path({ type: 'Sphere' })
      ctx.fill()

      // Gentle blue-white rim light along the limb
      const rim = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r)
      rim.addColorStop(0, 'rgba(232, 245, 250, 0)')
      rim.addColorStop(1, 'rgba(200, 232, 245, 0.22)')
      ctx.fillStyle = rim
      ctx.beginPath()
      path({ type: 'Sphere' })
      ctx.fill()

      // Routes
      for (const rt of routes) {
        const s = MODE_STYLE[rt.mode]
        ctx.beginPath()
        path(rt.line)
        ctx.setLineDash(s.dash)
        ctx.strokeStyle = s.stroke
        ctx.lineWidth = rt.mode === 'sea' ? 1.6 : 1.2
        ctx.stroke()
      }
      ctx.setLineDash([])

      // Hubs
      for (const hub of HUBS) {
        if (geoDistance(hub.coords, center) > Math.PI / 2 - 0.05) continue
        const [x, y] = projection(hub.coords)
        ctx.fillStyle = hub.home ? '#f4b860' : 'rgba(245, 250, 252, 0.9)'
        ctx.beginPath()
        ctx.arc(x, y, hub.home ? 3.2 : 2.2, 0, Math.PI * 2)
        ctx.fill()
        if (hub.home) {
          const pulse = (t * 0.6) % 1
          ctx.strokeStyle = `rgba(244, 184, 96, ${0.6 * (1 - pulse)})`
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.arc(x, y, 3 + pulse * 10, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // Moving markers (ships / aircraft / rail)
      for (const rt of routes) {
        const p = (rt.offset + t * GLOBE.markerSpeed * rt.speed) % 1
        const pos = rt.interp(p)
        if (geoDistance(pos, center) > Math.PI / 2 - 0.03) continue
        const [x, y] = projection(pos)
        const s = MODE_STYLE[rt.mode]
        ctx.shadowColor = s.marker
        ctx.shadowBlur = 10
        ctx.fillStyle = s.marker
        ctx.beginPath()
        if (rt.mode === 'air') {
          // small diamond for aircraft
          ctx.moveTo(x, y - 3.2)
          ctx.lineTo(x + 2.4, y)
          ctx.lineTo(x, y + 3.2)
          ctx.lineTo(x - 2.4, y)
        } else {
          ctx.arc(x, y, rt.mode === 'sea' ? 2.8 : 2.2, 0, Math.PI * 2)
        }
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!dragging) rotation[0] += GLOBE.rotationDegPerSec * dt
      t += dt
      draw()
      raf = requestAnimationFrame(frame)
    }
    const start = () => {
      if (!animate || raf || !visible || document.hidden) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }

    // Drag to rotate (horizontal touch drags only; vertical scrolling still works)
    const onDown = (e) => {
      dragging = { x: e.clientX, y: e.clientY, rot: [...rotation] }
      canvas.setPointerCapture?.(e.pointerId)
    }
    const onMove = (e) => {
      if (!dragging) return
      const k = 75 / projection.scale()
      rotation = [dragging.rot[0] + (e.clientX - dragging.x) * k * 4, Math.max(-60, Math.min(60, dragging.rot[1] - (e.clientY - dragging.y) * k * 4))]
      if (!raf) draw()
    }
    const onUp = () => (dragging = null)

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      visible ? start() : stop()
    })
    io.observe(canvas)
    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVis)
    canvas.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)

    resize()
    start()

    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [animate])

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full cursor-grab touch-pan-y active:cursor-grabbing ${className}`}
      role="img"
      aria-label="Animated globe showing illustrative ocean, air and rail trade routes into Canada. Drag to rotate."
    />
  )
}
