import { useId } from 'react'

// Small shared UI pieces: icons, buttons, badges, logo, section headings.

const ICONS = {
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowLeft: 'M19 12H5M11 18l-6-6 6-6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chevronDown: 'M6 9l6 6 6-6',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  info: 'M12 16v-4M12 8h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  tag: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8ZM7.5 7.5h.01',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  ship: 'M2 20c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0M4 18l-1-5h18l-2 5M6 13V8h12v5M12 4v4',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  printer: 'M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z',
  refresh: 'M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5',
  sparkles: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3ZM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z',
  layers: 'M12 3 2 8l10 5 10-5-10-5ZM2 13l10 5 10-5M2 17.5l10 5 10-5',
  user: 'M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  users: 'M16 21a6 6 0 0 0-12 0M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21a6 6 0 0 0-4.5-5.8M15 4.3a4 4 0 0 1 0 7.4',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6 15V9a3 3 0 0 1 3-3h7M18 9v6a3 3 0 0 1-3 3H8',
  cloud: 'M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7Z',
  anchor: 'M12 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM12 8v13M5 12H3a9 9 0 0 0 18 0h-2M8 12h8',
  box: 'M21 8 12 3 3 8v8l9 5 9-5V8ZM3 8l9 5 9-5M12 13v8',
  plane: 'M21 15v-2l-8-5V4a1.5 1.5 0 0 0-3 0v4l-8 5v2l8-2.5V18l-2.5 2v1.5L11.5 20l4 1.5V20L13 18v-5.5L21 15Z',
  shield: 'M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z',
  map: 'M9 4 3 6.5v14L9 18l6 2.5 6-2.5V4l-6 2.5L9 4ZM9 4v14M15 6.5v14',
  chart: 'M4 20V10M10 20V4M16 20v-7M21 20H3',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.3-.9-2 3.4 2 1.5a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9a7.6 7.6 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 1.7-1l2.3.9 2-3.4-2-1.5Z',
  leaf: 'M20 4C11 4 5 8 5 15c0 1.5.4 3 1 4M20 4c0 9-4 15-11 15-1 0-2-.1-3-.6M6 19c2-5 5-8 9-10',
  file: 'M14 3H6v18h12V7l-4-4ZM14 3v4h4M9 13h6M9 17h6',
  truck: 'M2 6h12v11H2zM14 10h4l3 3v4h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  train: 'M6 4h12a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2ZM4 11h16M8 18l-2 3M16 18l2 3',
  flag: 'M5 21V4M5 4c5-2 8 2 14 0v10c-6 2-9-2-14 0',
  lock: 'M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6',
  edit: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  logout: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l-4 4 4 4M6 12h10',
  activity: 'M3 12h4l3 8 4-16 3 8h4',
  filter: 'M3 5h18l-7 8v6l-4 2v-8L3 5Z',
  building: 'M4 21V5l8-2v18M12 9l8 2v10M2 21h20M8 8h.01M8 12h.01M8 16h.01M16 13h.01M16 17h.01',
  home: 'M3 11l9-8 9 8M5 9.5V21h14V9.5M10 21v-6h4v6',
  scale: 'M12 4v16M6 20h12M4 8h16M7 8l-3 7a3.5 3.5 0 0 0 6 0L7 8ZM17 8l-3 7a3.5 3.5 0 0 0 6 0l-3-7Z',
}

export function Icon({ name, className = 'h-5 w-5', strokeWidth = 1.8 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  )
}

const BUTTON_VARIANTS = {
  primary:
    'bg-brand-700 text-white shadow-sm shadow-brand-900/20 hover:bg-brand-800 hover:shadow-md active:bg-brand-900 disabled:bg-slate-300 disabled:shadow-none',
  secondary: 'bg-white text-navy ring-1 ring-inset ring-slate-300 hover:bg-ice hover:ring-slate-400',
  ghost: 'text-slate-700 hover:bg-mist hover:text-navy',
  soft: 'bg-brand-50 text-brand-800 hover:bg-brand-100',
  // On dark, cinematic sections
  glow: 'bg-teal text-midnight shadow-lg shadow-teal/25 hover:bg-aqua hover:shadow-aqua/30',
  glass: 'bg-white/8 text-white ring-1 ring-inset ring-white/25 backdrop-blur hover:bg-white/15 hover:ring-white/40',
  ghostDark: 'text-slate-200 hover:bg-white/10 hover:text-white',
}
const BUTTON_SIZES = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-xl font-semibold whitespace-nowrap transition-[background-color,box-shadow,color,transform] duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 [&>svg:last-child]:transition-transform hover:[&>svg:last-child]:translate-x-0.5 ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

const BADGE_TONES = {
  brand: 'bg-brand-50 text-brand-800 ring-brand-200',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  sky: 'bg-sky-50 text-sky-800 ring-sky-200',
  rose: 'bg-rose-50 text-rose-800 ring-rose-200',
  dark: 'bg-white/8 text-aqua ring-aqua/30 backdrop-blur',
}

export function Badge({ tone = 'brand', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

/** tone="light" for dark backgrounds. */
export function Logo({ className = '', tone = 'dark' }) {
  const light = tone === 'light'
  const gid = 'logo' + useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#14b8a6" />
            <stop offset="1" stopColor="#176b9a" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill={`url(#${gid})`} />
        <path d="M16 6c-4.4 0-8 3.4-8 7.7 0 5.6 8 12.3 8 12.3s8-6.7 8-12.3C24 9.4 20.4 6 16 6Z" fill="#fff" />
        <path d="m12.5 13.5 2.5 2.5 4.5-4.5" stroke="#176b9a" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={`font-display text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-navy'}`}>Waymark</span>
    </span>
  )
}

export function SectionHeading({ eyebrow, title, children, center = false, id }) {
  return (
    <div className={`max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
      {eyebrow && <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">{eyebrow}</p>}
      <h2 id={id} className="mt-2 text-3xl font-bold text-balance text-navy sm:text-4xl lg:text-[2.6rem]">
        {title}
      </h2>
      {children && <p className="mt-4 text-lg text-pretty text-slate-600">{children}</p>}
    </div>
  )
}

/** Level chip for rule-based indicators. */
export function LevelChip({ level }) {
  const map = {
    review: { tone: 'rose', label: 'Review' },
    watch: { tone: 'amber', label: 'Watch' },
    ok: { tone: 'emerald', label: 'OK' },
  }
  const { tone, label } = map[level] ?? map.ok
  return <Badge tone={tone}>{label}</Badge>
}
