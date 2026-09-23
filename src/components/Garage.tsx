import { motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, Coins, PackageOpen } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { formatEuros, quickSellValue } from '../game/economy'
import { ALL_CARDS } from '../game/pack'
import type { CardClass, CardView } from '../types'
import { CarCard, CLASS_COLORS, useCardGrid } from './CarCard'
import { PageHeader } from './ui/PageHeader'

type Filter = 'all' | 'bronze' | 'silver' | 'gold' | 'special' | 'rare'
type Sort = 'rating' | 'name' | 'owned'

const FILTERS: [Filter, string][] = [
  ['all', 'All'],
  ['bronze', 'Bronze'],
  ['silver', 'Silver'],
  ['gold', 'Gold'],
  ['rare', 'Rare'],
  ['special', 'Special'],
]

const CLASSES: [CardClass, string][] = [
  ['bronze', 'Bronze'],
  ['silver', 'Silver'],
  ['gold', 'Gold'],
  ['special', 'Special'],
]

function matchesFilter(c: CardView, filter: Filter): boolean {
  if (filter === 'all') return true
  if (filter === 'rare') return c.rare
  if (filter === 'special') return c.cardClass === 'special'
  return c.tier === filter && c.cardClass !== 'special'
}

/** A tiny card in a tier's colours, used wherever a tier is named. */
export function TierSwatch({ cls, className = '' }: { cls: CardClass; className?: string }) {
  const [deep, mid, light] = CLASS_COLORS[cls]
  return (
    <span
      aria-hidden
      className={`inline-block h-3.5 w-2.5 shrink-0 rounded-[2px] ${className}`}
      style={{
        background:
          cls === 'special'
            ? 'linear-gradient(160deg, #6d1f5e, #1b0a1c)'
            : `linear-gradient(160deg, ${light}, ${mid} 45%, ${deep})`,
        boxShadow: `inset 0 0 0 1px ${cls === 'special' ? '#c9a227' : 'rgba(255,255,255,.35)'}`,
      }}
    />
  )
}

/** A native select dressed as a `.field`, with a chevron and a visible label for screen readers. */
export function FilterSelect({
  label,
  value,
  onChange,
  children,
  className = '',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`relative block min-w-0 ${className}`}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field w-full cursor-pointer appearance-none truncate pr-9 font-display text-[0.95rem] font-bold uppercase tracking-wide"
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        size={16}
        strokeWidth={2.4}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gold-2/80"
      />
    </label>
  )
}

interface Props {
  collection: Record<string, number>
  packsOpened: number
  onInspect: (card: CardView) => void
  onSellDuplicates: () => number
}

export function Garage({ collection, packsOpened, onInspect, onSellDuplicates }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [make, setMake] = useState('all')
  const [sort, setSort] = useState<Sort>('rating')
  const [confirming, setConfirming] = useState(false)
  const reduceMotion = useReducedMotion()
  const grid = useCardGrid()

  const owned = useMemo(
    () => ALL_CARDS.filter((c) => (collection[c.id] ?? 0) > 0),
    [collection],
  )

  const makes = useMemo(
    () => ['all', ...Array.from(new Set(owned.map((c) => c.make))).sort()],
    [owned],
  )

  const visible = useMemo(() => {
    const matches = owned.filter((c) => {
      if (make !== 'all' && c.make !== make) return false
      return matchesFilter(c, filter)
    })
    return matches.sort((a, b) => {
      if (sort === 'name') return `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`)
      if (sort === 'owned') return (collection[b.id] ?? 0) - (collection[a.id] ?? 0)
      return b.overall - a.overall
    })
  }, [owned, filter, make, sort, collection])

  // How many owned cars each chip would show, ignoring the make filter so the
  // counts stay put while you flip between makes.
  const filterCounts = useMemo(() => {
    const counts = {} as Record<Filter, number>
    for (const [key] of FILTERS) counts[key] = owned.filter((c) => matchesFilter(c, key)).length
    return counts
  }, [owned])

  const classOwned = useMemo(() => {
    const counts: Record<CardClass, number> = { bronze: 0, silver: 0, gold: 0, special: 0 }
    for (const c of owned) counts[c.cardClass]++
    return counts
  }, [owned])

  const duplicateValue = useMemo(
    () =>
      owned.reduce(
        (sum, c) => sum + quickSellValue(c) * Math.max(0, (collection[c.id] ?? 0) - 1),
        0,
      ),
    [owned, collection],
  )

  const completion = Math.round((owned.length / ALL_CARDS.length) * 100)

  // Best first, with the top card in the middle of the fan.
  const showcase = useMemo(() => {
    const [first, second, third] = [...owned].sort((a, b) => b.overall - a.overall)
    return [second, first, third].filter((c): c is CardView => Boolean(c))
  }, [owned])

  const quickSell =
    duplicateValue > 0 ? (
      confirming ? (
        <div
          role="group"
          aria-label="Confirm quick-sell"
          className="panel flex flex-wrap items-center gap-2 border-gold-2/30 p-2 pl-3"
        >
          <span className="text-sm text-white/70">
            Sell all duplicates for{' '}
            <span className="num text-base text-gold-2">{formatEuros(duplicateValue)}</span>?
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => {
                onSellDuplicates()
                setConfirming(false)
              }}
              className="btn btn-primary btn-sm"
            >
              Confirm
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="btn btn-secondary btn-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="btn btn-secondary btn-sm">
          <Coins size={15} strokeWidth={2.4} className="text-gold-2" />
          Quick-sell duplicates
          <span className="num not-italic text-gold-2">{formatEuros(duplicateValue)}</span>
        </button>
      )
    ) : null

  return (
    <div>
      <PageHeader eyebrow="Garage" title="My cars" className="mb-5" />

      {/* trophy case: the collection at a glance */}
      <section
        aria-label="Collection progress"
        className="panel-cut relative mb-6 overflow-hidden p-4 sm:p-6"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 55% 90% at 100% 0%, rgb(232 194 90 / 0.16), transparent 70%), repeating-linear-gradient(-55deg, transparent 0 14px, rgb(255 255 255 / 0.025) 14px 15px)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-gold-2 via-gold-2/40 to-transparent"
        />

        <div className="relative flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow text-gold-2/80">Trophy case</p>
            <p className="mt-1 flex items-baseline gap-1.5 font-display italic leading-none">
              <span className="num text-[3.4rem] leading-[0.85] text-white sm:text-7xl">{owned.length}</span>
              <span className="num text-xl text-white/35 sm:text-3xl">/ {ALL_CARDS.length}</span>
            </p>
            <p className="eyebrow mt-2">Cars collected</p>
          </div>

          {/* the three best cards on the shelf, fanned like a hand */}
          {showcase.length > 0 && (
            <div className="hidden min-w-0 flex-1 items-end justify-center sm:flex" aria-label="Top rated in your garage">
              {showcase.map((card, i) => {
                const offset = i - (showcase.length - 1) / 2
                return (
                  <div
                    key={card.id}
                    className="-mx-3 drop-shadow-[0_10px_18px_rgb(0_0_0/0.6)]"
                    style={{
                      transform: `rotate(${offset * 9}deg) translateY(${Math.abs(offset) * 8}px)`,
                      zIndex: showcase.length - Math.abs(offset) * 2,
                    }}
                  >
                    <CarCard card={card} scale={0.36} onClick={() => onInspect(card)} />
                  </div>
                )
              })}
            </div>
          )}

          <div className="shrink-0 text-right">
            <p className="num text-5xl italic leading-[0.85] text-gold-2 drop-shadow-[0_0_18px_rgb(232_194_90/0.45)] sm:text-6xl">
              {completion}
              <span className="text-2xl sm:text-3xl">%</span>
            </p>
            <p className="eyebrow mt-2">Complete</p>
          </div>
        </div>

        {/* completion bar */}
        <div
          role="progressbar"
          aria-label="Collection completion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completion}
          className="relative mt-4 h-3 overflow-hidden bg-black/50 ring-1 ring-white/[0.07]"
          style={{ clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)' }}
        >
          <motion.div
            className="relative h-full overflow-hidden bg-gradient-to-r from-gold-1 via-gold-2 to-gold-3 shadow-[0_0_14px_rgb(232_194_90/0.6)]"
            initial={reduceMotion ? false : { width: 0 }}
            animate={{ width: `${completion}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <span className="absolute inset-y-0 left-0 w-1/3 animate-sheen bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          </motion.div>
          {/* tick marks every 10%, like a rev counter */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'repeating-linear-gradient(90deg, transparent 0 calc(10% - 1px), rgb(0 0 0 / 0.55) calc(10% - 1px) 10%)',
            }}
          />
        </div>

        <div className="relative mt-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Cars owned by tier">
            {CLASSES.map(([cls, label]) => (
              <li key={cls} className="flex items-center gap-1.5">
                <TierSwatch cls={cls} />
                <span className="eyebrow hidden sm:inline">{label}</span>
                <span className="sr-only sm:hidden">{label}</span>
                <span className="num text-lg leading-none">{classOwned[cls]}</span>
              </li>
            ))}
          </ul>
          <p className="flex items-baseline gap-2">
            <span className="eyebrow">Packs opened</span>
            <span className="num text-lg leading-none">{packsOpened}</span>
          </p>
        </div>

        {quickSell && (
          <div className="relative mt-4 border-t border-white/[0.07] pt-4 [&>.btn]:w-full sm:[&>.btn]:w-auto">
            {quickSell}
          </div>
        )}
      </section>

      {/* filters: tier chips scroll in their own strip on a phone, dropdowns sit side by side */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div
          role="group"
          aria-label="Filter by tier"
          className="-mx-4 -my-1 flex min-w-0 gap-1.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:flex-1 [&::-webkit-scrollbar]:hidden"
        >
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`chip shrink-0 ${filter === key ? 'chip-on' : ''}`}
            >
              {key !== 'all' && key !== 'rare' && <TierSwatch cls={key} />}
              {label}
              <span className={`num text-[0.8rem] ${filter === key ? 'text-black/55' : 'text-white/35'}`}>
                {filterCounts[key]}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 lg:ml-auto lg:flex lg:shrink-0">
          <FilterSelect label="Make" value={make} onChange={setMake} className="lg:w-40">
            {makes.map((m) => (
              <option key={m} value={m} className="bg-asphalt">
                {m === 'all' ? 'All makes' : m}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Sort by" value={sort} onChange={(v) => setSort(v as Sort)} className="lg:w-36">
            <option value="rating" className="bg-asphalt">Rating</option>
            <option value="name" className="bg-asphalt">Name</option>
            <option value="owned" className="bg-asphalt">Copies</option>
          </FilterSelect>
        </div>
      </div>

      {owned.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 px-6 py-10 text-center">
          <span className="grid size-14 place-items-center rounded-full border border-gold-2/30 bg-gold-2/10 text-gold-2">
            <PackageOpen size={26} strokeWidth={2} />
          </span>
          <p className="headline text-2xl">Garage empty</p>
          <p className="text-sm text-white/50">Nothing here yet. Open a pack in the store.</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="panel px-6 py-12 text-center text-sm text-white/50">No cars match these filters.</p>
      ) : (
        <div ref={grid.ref} style={grid.style}>
          {visible.map((card) => {
            const copies = collection[card.id] ?? 0
            return (
              <div key={card.id} className="relative">
                <CarCard card={card} scale={grid.scale} onClick={() => onInspect(card)} />
                {copies > 1 && (
                  <span
                    aria-label={`${copies} copies`}
                    className="num pointer-events-none absolute -right-1.5 -top-1.5 z-10 rounded-md bg-pitch px-1.5 py-1 text-[13px] leading-none text-gold-2 shadow-[0_2px_8px_rgb(0_0_0/0.6)] ring-1 ring-gold-2/60"
                  >
                    ×{copies}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
