import type { ReactNode } from 'react'

/**
 * The title block every screen opens with: a heavy italic headline behind a
 * gold slash, an optional eyebrow above it, a line of context under it, and
 * a slot on the right for whatever the screen measures (a count, a timer).
 */
export function PageHeader({
  title,
  eyebrow,
  subtitle,
  right,
  className = '',
}: {
  title: ReactNode
  eyebrow?: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
  className?: string
}) {
  return (
    <header className={`mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h2 className="headline flex items-center gap-3 text-4xl sm:text-5xl">
          <span
            aria-hidden
            className="inline-block h-[0.8em] w-2.5 shrink-0 bg-gold-2 shadow-[0_0_18px_rgb(232_194_90/0.55)]"
            style={{ clipPath: 'polygon(40% 0, 100% 0, 60% 100%, 0 100%)' }}
          />
          <span className="min-w-0">{title}</span>
        </h2>
        {subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  )
}
