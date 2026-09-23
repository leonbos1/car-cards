import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { useId } from 'react'
import { Badge } from './Badge'

export interface SubTab<T extends string> {
  id: T
  label: string
  icon?: LucideIcon
  badge?: number
}

/**
 * The tab strip inside a screen: Events / Championship, My cars / Catalog.
 * The underline slides between tabs rather than jumping, so it is obvious
 * which way you moved.
 */
export function SubTabs<T extends string>({
  tabs,
  value,
  onChange,
  className = '',
}: {
  tabs: SubTab<T>[]
  value: T
  onChange: (id: T) => void
  className?: string
}) {
  // One layoutId per strip, so two strips on a page never trade underlines.
  const layoutId = useId()
  return (
    <div
      role="tablist"
      className={`flex gap-1 overflow-x-auto border-b border-white/[0.08] [scrollbar-width:none] ${className}`}
    >
      {tabs.map(({ id, label, icon: Icon, badge }) => {
        const active = id === value
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={`relative flex shrink-0 items-center gap-2 px-3 pb-2.5 pt-2 font-display text-[15px] font-bold uppercase tracking-wide transition-colors sm:px-4 ${
              active ? 'text-white' : 'text-white/45 hover:text-white/80'
            }`}
          >
            {/* On a phone the icons would push the last tab off the edge
                ("CLICKE…" at 360px); the label and badge carry it alone. */}
            {Icon && (
              <Icon size={16} strokeWidth={2.4} className={`hidden sm:block ${active ? 'text-gold-2' : ''}`} />
            )}
            {label}
            <Badge count={badge} />
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-x-1 -bottom-px h-[3px] bg-gold-2 shadow-[0_0_12px_rgb(232_194_90/0.7)]"
                style={{ clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)' }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
