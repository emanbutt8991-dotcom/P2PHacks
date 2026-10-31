export function Leaf({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor" role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <polygon points="50,4 56,18 64,14 61,38 76,24 79,32 92,30 86,46 94,50 72,66 76,74 54,71 53,94 47,94 46,71 24,74 28,66 6,50 14,46 8,30 21,32 24,24 39,38 36,14 44,18" />
    </svg>
  );
}
