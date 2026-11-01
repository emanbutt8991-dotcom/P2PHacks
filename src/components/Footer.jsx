import { FOOTER_GROUPS, LEGAL_LINKS } from '../data/content.js'
import { Logo } from './ui.jsx'

export default function Footer({ onOpenDialog, onOpenDemo }) {
  const linkCls = 'text-sm text-slate-300 transition-colors hover:text-aqua'

  const renderLink = (l) => {
    if (l.type === 'link')
      return (
        <a href={l.target} className={linkCls}>
          {l.label}
        </a>
      )
    return (
      <button
        type="button"
        className={`${linkCls} text-left`}
        onClick={() => (l.type === 'demo' ? onOpenDemo(l.target) : onOpenDialog(l.target))}
      >
        {l.label}
      </button>
    )
  }

  return (
    <footer className="bg-deep text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_3fr]">
          <div>
            <Logo tone="light" />
            <p className="mt-4 max-w-xs text-sm text-slate-400">
              Supply-chain risk and cost scenario planning for SMEs. A hackathon prototype using illustrative data.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {FOOTER_GROUPS.map((g) => (
              <div key={g.title}>
                <h2 className="text-sm font-semibold text-white">{g.title}</h2>
                <ul className="mt-3 space-y-2">
                  {g.links.map((l) => (
                    <li key={l.label}>{renderLink(l)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">© 2026 Waymark. Hackathon prototype — not a commercial service.</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <li key={l.target}>
                <button type="button" className={linkCls} onClick={() => onOpenDialog(l.target)}>
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
