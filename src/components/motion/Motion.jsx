import { money } from '../../utils/format.js'
import { useReveal, useTweenedNumber } from '../../hooks/useMotion.js'

/** Wraps children in a scroll-reveal container. */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useReveal(delay)
  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  )
}

/**
 * Animated currency/number. Screen readers and copy/paste get the exact final
 * value immediately; the visual count-up is decorative and very short.
 */
export function AnimatedNumber({ value, format = money, prefix = '' }) {
  const shown = useTweenedNumber(value)
  // relative wrapper keeps the sr-only copy anchored inside scroll containers
  return (
    <span className="relative">
      <span aria-hidden="true">
        {prefix}
        {format(shown)}
      </span>
      <span className="sr-only">
        {prefix}
        {format(value)}
      </span>
    </span>
  )
}
