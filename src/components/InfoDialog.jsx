import { useEffect, useRef } from 'react'
import { DIALOGS } from '../data/content.js'
import { Badge, Button, Icon } from './ui.jsx'

/*
  One reusable dialog built on the native <dialog> element, which provides
  focus trapping, Escape-to-close and focus return for free.
*/
export default function InfoDialog({ dialogKey, onClose, onOpenDemo }) {
  const ref = useRef(null)
  const content = dialogKey ? DIALOGS[dialogKey] : null

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (content && !el.open) el.showModal()
    if (!content && el.open) el.close()
  }, [content])

  const goTo = (target) => {
    onClose()
    // Wait for the dialog to close before scrolling
    requestAnimationFrame(() => document.querySelector(target)?.scrollIntoView())
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()} // backdrop click
      aria-labelledby="info-dialog-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-white p-0 text-slate-700 shadow-2xl shadow-slate-900/20"
    >
      {content && (
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              {content.badge && <Badge tone={content.badge.includes('Planned') ? 'amber' : 'brand'}>{content.badge}</Badge>}
              <h2 id="info-dialog-title" className="mt-2 text-xl font-bold text-slate-900">
                {content.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-m-1 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close dialog"
            >
              <Icon name="close" />
            </button>
          </div>

          <div className="mt-4 space-y-3 text-[15px] leading-relaxed">
            {content.paragraphs?.map((p) => <p key={p}>{p}</p>)}
            {content.bullets && (
              <ul className="space-y-2">
                {content.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" strokeWidth={2.4} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {content.links && (
              <ul className="space-y-1">
                {content.links.map((l) => (
                  <li key={l.target}>
                    <button
                      type="button"
                      onClick={() => goTo(l.target)}
                      className="inline-flex items-center gap-1 font-medium text-brand-700 hover:text-brand-900 hover:underline"
                    >
                      {l.label} <Icon name="arrowRight" className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {content.footnote && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{content.footnote}</p>}
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {content.action && (
              <Button
                onClick={() => {
                  onClose()
                  onOpenDemo(content.action === 'sample' ? 'sample' : 'blank')
                }}
              >
                {content.action === 'sample' ? 'Open sample demo' : 'Start the questionnaire'}
                <Icon name="arrowRight" className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}
