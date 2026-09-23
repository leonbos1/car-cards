import { motion, useReducedMotion } from 'framer-motion'
import { GalleryHorizontalEnd, LayoutGrid, Lock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ALL_CARDS } from '../game/pack'
import type { CardClass, CardView } from '../types'
import { BrandBadge } from './BrandBadge'
import { CarCard, CLASS_COLORS, useCardGrid } from './CarCard'
import { FilterSelect } from './Garage'
import { PageHeader } from './ui/PageHeader'

type Filter = 'all' | 'bronze' | 'silver' | 'gold' | 'special' | 'rare' | 'unowned'
type Sort = 'rating' | 'name' | 'tier'

const FILTERS: [Filter, string][] = [
  ['all', 'All Cars'],
  ['bronze', 'Bronze'],
  ['silver', 'Silver'],
  ['gold', 'Gold'],
  ['rare', 'Rare'],
  ['special', 'Special'],
  ['unowned', 'Not Owned'],
]

const TIERS: { tier: CardClass; label: string }[] = [
  { tier: 'bronze', label: 'Bronze' },
  { tier: 'silver', label: 'Silver' },
  { tier: 'gold', label: 'Gold' },
  { tier: 'special', label: 'Special' },
]

interface Props {
  collection: Record<string, number>
  onInspect: (card: CardView) => void
}

export function Catalog({ collection, onInspect }: Props) {
  const [view, setView] = useState<'cars' | 'brands'>('brands')
  const [filter, setFilter] = useState<Filter>('all')
  const [make, setMake] = useState('all')
  const [sort, setSort] = useState<Sort>('rating')
  const reduceMotion = useReducedMotion()
  const grid = useCardGrid()

  const allCars = useMemo(
    () =>
      ALL_CARDS.map((car) => ({
        ...car,
        owned: (collection[car.id] ?? 0) > 0,
        ownCount: collection[car.id] ?? 0,
      })),
    [collection],
  )

  const makes = useMemo(
    () => ['all', ...Array.from(new Set(ALL_CARDS.map((c) => c.make))).sort()],
    [],
  )

  const visible = useMemo(() => {
    const matches = allCars.filter((c) => {
      if (make !== 'all' && c.make !== make) return false
      if (filter === 'all') return true
      if (filter === 'unowned') return !c.owned
      if (filter === 'rare') return c.rare
      if (filter === 'special') return c.cardClass === 'special'
      return c.tier === filter && c.cardClass !== 'special'
    })
    return matches.sort((a, b) => {
      if (sort === 'name') return `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`)
      if (sort === 'tier') {
        const tierOrder = { bronze: 0, silver: 1, gold: 2, special: 3 }
        return (tierOrder[a.tier] ?? 0) - (tierOrder[b.tier] ?? 0)
      }
      return b.overall - a.overall
    })
  }, [allCars, filter, make, sort])

  const ownedCount = useMemo(
    () => allCars.filter((c) => c.owned).length,
    [allCars],
  )

  const completion = Math.round((ownedCount / ALL_CARDS.length) * 100)

  const brands = useMemo(() => {
    const byMake = new Map<string, { make: string; owned: number; total: number }>()
    for (const car of allCars) {
      const row = byMake.get(car.make) ?? { make: car.make, owned: 0, total: 0 }
      row.total++
      if (car.owned) row.owned++
      byMake.set(car.make, row)
    }
    // Marques you have made a start on first, then the biggest collections to
    // chase, so the grid opens on what is actually in progress.
    return [...byMake.values()].sort(
      (a, b) => b.owned - a.owned || b.total - a.total || a.make.localeCompare(b.make),
    )
  }, [allCars])

  // Bucket by cardClass, not tier: a special carries tier 'gold', so counting
  // by tier put every special in the gold total and left special at 0 / 0.
  const tierCounts = useMemo(() => {
    const counts = { bronze: 0, silver: 0, gold: 0, special: 0 }
    ALL_CARDS.forEach((c) => {
      counts[c.cardClass]++
    })
    return counts
  }, [])

  const tierOwned = useMemo(() => {
    const owned = { bronze: 0, silver: 0, gold: 0, special: 0 }
    allCars.forEach((c) => {
      if (c.owned) owned[c.cardClass]++
    })
    return owned
  }, [allCars])

  return (
    <div>
      <PageHeader
        eyebrow="Full roster"
        title="Catalog"
        subtitle={
          <>
            <span className="num text-base text-white/85">{ownedCount}</span> of{' '}
            <span className="num text-base text-white/85">{ALL_CARDS.length}</span> cars collected
          </>
        }
        right={
          <div className="text-right">
            <p className="num text-5xl italic leading-[0.85] text-gold-2 drop-shadow-[0_0_18px_rgb(232_194_90/0.45)]">
              {completion}
              <span className="text-2xl">%</span>
            </p>
            <p className="eyebrow mt-1.5">Complete</p>
          </div>
        }
        className="mb-5"
      />

      {/* Tier progress */}
      <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {TIERS.map(({ tier, label }) => {
          // A tier can legitimately be empty while the roster is being tuned.
          const pct = tierCounts[tier] ? Math.round((tierOwned[tier] / tierCounts[tier]) * 100) : 0
          const [deep, mid, light] = CLASS_COLORS[tier]
          const accent = tier === 'special' ? '#e27bcb' : mid
          return (
            <div key={tier} className="panel relative overflow-hidden p-3 sm:p-4">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-25 blur-2xl"
                style={{ background: accent }}
              />
              <div className="relative flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block h-5 w-3.5 shrink-0 rounded-[3px]"
                  style={{
                    background:
                      tier === 'special'
                        ? 'linear-gradient(160deg, #6d1f5e, #1b0a1c)'
                        : `linear-gradient(160deg, ${light}, ${mid} 45%, ${deep})`,
                    boxShadow: `inset 0 0 0 1px ${tier === 'special' ? '#c9a227' : 'rgba(255,255,255,.35)'}`,
                  }}
                />
                <span className="eyebrow text-white/70">{label}</span>
              </div>
              <div className="relative mt-2 flex items-baseline justify-between gap-2">
                <span className="num text-3xl italic leading-none">
                  {pct}
                  <span className="text-lg text-white/50">%</span>
                </span>
                <span className="num text-sm text-white/45">
                  {tierOwned[tier]} / {tierCounts[tier]}
                </span>
              </div>
              <ProgressBar pct={pct} color={accent} className="relative mt-2.5" />
            </div>
          )
        })}
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="View"
          className="inline-flex gap-1 rounded-full border border-white/[0.08] bg-black/40 p-0.5"
        >
          {([['brands', 'By brand', LayoutGrid], ['cars', 'All cars', GalleryHorizontalEnd]] as const).map(
            ([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`chip min-h-11 border-transparent ${view === v ? 'chip-on' : 'bg-transparent'}`}
              >
                <Icon size={15} strokeWidth={2.4} />
                {label}
              </button>
            ),
          )}
        </div>
        <p className="eyebrow">
          {view === 'brands' ? (
            <>
              <span className="num text-sm text-white/70">{brands.length}</span> marques
            </>
          ) : (
            <>
              Showing <span className="num text-sm text-white/70">{visible.length}</span> of{' '}
              {ALL_CARDS.length}
            </>
          )}
        </p>
      </div>

      {view === 'brands' ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {brands.map(({ make: brand, owned, total }) => {
            const pct = Math.round((owned / total) * 100)
            const complete = owned === total
            return (
              <button
                key={brand}
                type="button"
                onClick={() => {
                  setMake(brand)
                  setFilter('all')
                  setView('cars')
                }}
                aria-label={`${brand}: ${owned} of ${total} collected`}
                className={`panel panel-interactive relative flex flex-col overflow-hidden p-3 text-left sm:p-3.5 ${
                  complete
                    ? 'border-gold-2/55 bg-[linear-gradient(160deg,rgb(232_194_90/0.16),var(--color-asphalt)_70%)]'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={owned === 0 ? 'opacity-45 grayscale-[0.6]' : ''}>
                    <BrandBadge make={brand} size={40} />
                  </span>
                  {complete ? (
                    <span className="tag mt-0.5 shrink-0">Complete</span>
                  ) : (
                    <span className="num shrink-0 text-2xl italic leading-none text-white/75">
                      {pct}
                      <span className="text-sm text-white/40">%</span>
                    </span>
                  )}
                </div>
                <div className="mt-2.5 truncate font-display text-lg font-extrabold uppercase italic leading-tight">
                  {brand}
                </div>
                <div className="num text-sm leading-tight text-white/40">
                  <span className={complete ? 'text-gold-2' : owned ? 'text-white/85' : ''}>{owned}</span> / {total}
                </div>
                <ProgressBar
                  pct={pct}
                  color={complete ? 'var(--color-gold-2)' : 'rgb(232 194 90 / 0.7)'}
                  glow={complete}
                  className="mt-2.5"
                />
              </button>
            )
          })}
        </div>
      ) : (
      <>
      {/* Controls */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div
          role="group"
          aria-label="Filter"
          className="-mx-4 -my-1 flex min-w-0 gap-1.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:flex-1 [&::-webkit-scrollbar]:hidden"
        >
          {FILTERS.map(([f, label]) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`chip shrink-0 ${filter === f ? 'chip-on' : ''}`}
            >
              {f === 'unowned' && <Lock size={13} strokeWidth={2.6} />}
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 lg:ml-auto lg:flex lg:shrink-0">
          <FilterSelect label="Make" value={make} onChange={setMake} className="lg:w-40">
            {makes.map((m) => (
              <option key={m} value={m} className="bg-asphalt">
                {m === 'all' ? 'All Makes' : m}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Sort by" value={sort} onChange={(v) => setSort(v as Sort)} className="lg:w-36">
            <option value="rating" className="bg-asphalt">By Rating</option>
            <option value="name" className="bg-asphalt">By Name</option>
            <option value="tier" className="bg-asphalt">By Tier</option>
          </FilterSelect>
        </div>
      </div>

      {/* Results */}
      <motion.div layout={!reduceMotion} ref={grid.ref} style={grid.style}>
        {visible.map((car) => (
          <motion.div key={car.id} layout={!reduceMotion} className="relative">
            <CarCard card={car} scale={grid.scale} onClick={() => onInspect(car)} />
            {/* Purely visual: taps fall through to the card's own button, so an
                unowned car still opens, and one tap opens it once. */}
            {!car.owned && (
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center bg-pitch/65"
                style={{ borderRadius: 18 * grid.scale }}
              >
                <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/70 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-widest text-white/80">
                  <Lock size={12} strokeWidth={2.6} />
                  Not Owned
                </span>
              </div>
            )}
            {car.ownCount > 1 && (
              <span
                aria-label={`${car.ownCount} copies`}
                className="num pointer-events-none absolute -right-1.5 -top-1.5 z-10 rounded-md bg-pitch px-1.5 py-1 text-[13px] leading-none text-gold-2 shadow-[0_2px_8px_rgb(0_0_0/0.6)] ring-1 ring-gold-2/60"
              >
                ×{car.ownCount}
              </span>
            )}
          </motion.div>
        ))}
      </motion.div>

      {visible.length === 0 && (
        <p className="panel px-6 py-12 text-center text-sm text-white/50">No cars match the selected filters.</p>
      )}

      <p className="eyebrow mt-8 text-center">
        Showing {visible.length} of {ALL_CARDS.length} cars
      </p>
      </>
      )}
    </div>
  )
}

/** A slant-ended bar for collection progress. */
function ProgressBar({
  pct,
  color,
  glow = false,
  className = '',
}: {
  pct: number
  color: string
  glow?: boolean
  className?: string
}) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={`h-1.5 overflow-hidden bg-white/[0.08] ${className}`}
      style={{ clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)' }}
    >
      <div
        className="h-full"
        style={{
          width: `${pct}%`,
          background: color,
          boxShadow: glow ? `0 0 10px ${color}` : undefined,
        }}
      />
    </div>
  )
}
