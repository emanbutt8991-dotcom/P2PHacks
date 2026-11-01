import { useEffect, useRef, useState } from 'react'
import { cinematicEnabled } from '../config/motion.js'

/** True when animations should run (setting on, no ?lite, no reduced-motion). */
export function useCinematic() {
  const [on, setOn] = useState(() => cinematicEnabled())
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const update = () => setOn(cinematicEnabled())
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return on
}

/**
 * Scroll reveal. Content is visible by default; it is only hidden once we know
 * an IntersectionObserver will reveal it again, so text can never get stuck invisible.
 */
export function useReveal(delay = 0) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !cinematicEnabled() || !('IntersectionObserver' in window)) return
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight * 0.92) return // already on screen: leave visible
    el.dataset.reveal = 'pending'
    el.style.setProperty('--reveal-delay', `${delay}ms`)
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.reveal = 'shown'
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    // Safety net: never leave content hidden for long
    const t = setTimeout(() => (el.dataset.reveal = 'shown'), 4000)
    return () => {
      io.disconnect()
      clearTimeout(t)
    }
  }, [delay])
  return ref
}

/**
 * Short count-up between values for display only. The exact value is always
 * exposed to assistive tech separately (see AnimatedNumber), and the animation
 * lasts at most `duration` ms — it never replaces or postpones the calculation.
 */
export function useTweenedNumber(value, duration = 320) {
  const [display, setDisplay] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (!cinematicEnabled()) {
      from.current = value
      setDisplay(value)
      return
    }
    const start = performance.now()
    const a = from.current
    let raf
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(a + (value - a) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      from.current = value
    }
  }, [value, duration])
  return display
}

/** Index of the story step currently in the middle of the viewport. */
export function useActiveStep(count) {
  const refs = useRef([])
  const [active, setActive] = useState(0)
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number(e.target.dataset.step))
        })
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    refs.current.slice(0, count).forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [count])
  const setRef = (i) => (el) => (refs.current[i] = el)
  return [active, setRef]
}
