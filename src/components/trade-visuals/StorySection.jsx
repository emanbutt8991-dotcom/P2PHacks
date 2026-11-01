import { STORY_SCENES } from '../../data/content.js'
import { useActiveStep } from '../../hooks/useMotion.js'
import { Button, Icon } from '../ui.jsx'
import StoryVisual from './StoryVisual.jsx'

/*
  Scroll-driven story. Desktop: text steps scroll past a sticky visual that
  changes scene. Mobile: each step shows its own visual inline (no sticky
  layers, so nothing can trap scrolling).
*/
export default function StorySection({ onOpenDemo }) {
  const [active, setRef] = useActiveStep(STORY_SCENES.length)

  return (
    <section id="story" className="ocean-story relative text-navy" aria-label="How global trade shapes your costs">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8 lg:py-10">
        <ol className="lg:py-[18vh]">
          {STORY_SCENES.map((s, i) => (
            <li
              key={s.title}
              ref={setRef(i)}
              data-step={i}
              className={`flex flex-col justify-center py-10 transition-opacity duration-500 lg:min-h-[72vh] lg:py-0 ${
                active === i ? 'lg:opacity-100' : 'lg:opacity-35'
              }`}
            >
              <p className="flex items-center gap-3 text-sm font-semibold tracking-wide text-brand-700 uppercase">
                <span className="font-display flex h-7 w-7 items-center justify-center rounded-full border border-brand-700/40 text-xs">
                  {i + 1}
                </span>
                {s.kicker}
              </p>
              <h2 className="mt-4 text-3xl font-bold text-balance text-navy sm:text-4xl">{s.title}</h2>
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-slate-600">{s.body}</p>
              {s.note && <p className="mt-3 text-xs text-slate-500">{s.note}</p>}
              {i === STORY_SCENES.length - 1 && (
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" variant="glow" onClick={() => onOpenDemo('blank')}>
                    Get started for free <Icon name="arrowRight" className="h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="secondary" onClick={() => onOpenDemo('sample')}>
                    Get a Demo
                  </Button>
                </div>
              )}
              {/* Inline visual on small screens */}
              <div className="mt-8 lg:hidden">
                <StoryVisual scene={i} />
              </div>
            </li>
          ))}
        </ol>
        <div className="hidden lg:block">
          <div className="sticky top-[calc(50vh-15rem)] flex h-[30rem] items-center">
            <StoryVisual scene={active} />
          </div>
        </div>
      </div>
    </section>
  )
}
