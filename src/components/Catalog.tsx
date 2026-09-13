import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { ALL_CARDS } from '../game/pack'
import type { CardView } from '../types'
import { CarCard } from './CarCard'

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

interface Props {
  collection: Record<string, number>
  onInspect: (card: CardView) => void
}

export function Catalog({ collection, onInspect }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [make, setMake] = useState('all')
  const [sort, setSort] = useState<Sort>('rating')

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
    <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6">
      <div className="mb-6 space-y-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Complete Catalog</h2>
          <p className="text-sm text-white/45">
            {ownedCount} of {ALL_CARDS.length} cars collected ({completion}%)
          </p>
        </div>

        {/* Tier progress */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { tier: 'bronze', label: 'Bronze' },
            { tier: 'silver', label: 'Silver' },
            { tier: 'gold', label: 'Gold' },
            { tier: 'special', label: 'Special' },
          ].map(({ tier, label }) => {
            const t = tier as keyof typeof tierCounts
            // A tier can legitimately be empty while the roster is being tuned.
            const pct = tierCounts[t] ? Math.round((tierOwned[t] / tierCounts[t]) * 100) : 0
            return (
              <div key={tier} className="rounded-lg bg-white/5 p-3">
                <div className="text-xs font-bold text-white/70">{label}</div>
                <div className="mt-1.5 text-lg font-extrabold">{pct}%</div>
                <div className="text-xs text-white/50">
                  {tierOwned[t]} / {tierCounts[t]}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="mb-5 space-y-3 rounded-lg bg-white/5 p-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(([f, label]) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                filter === f
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={make}
            onChange={(e) => setMake(e.target.value)}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white outline-none"
          >
            {makes.map((m) => (
              <option key={m} value={m}>
                {m === 'all' ? 'All Makes' : m}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white outline-none"
          >
            <option value="rating">By Rating</option>
            <option value="name">By Name</option>
            <option value="tier">By Tier</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <motion.div
        layout
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {visible.map((car) => (
          <motion.div
            key={car.id}
            layout
            className="relative cursor-pointer"
            onClick={() => onInspect(car)}
          >
            <CarCard card={car} onClick={() => onInspect(car)} />
            {!car.owned && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 backdrop-blur-sm">
                <span className="text-xs font-bold text-white/80">Not Owned</span>
              </div>
            )}
            {car.ownCount > 1 && (
              <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-gold-2 text-xs font-black text-black">
                {car.ownCount}
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {visible.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-white/40">No cars match the selected filters.</p>
        </div>
      )}

      <div className="mt-8 text-center text-xs text-white/40">
        Showing {visible.length} of {ALL_CARDS.length} cars
      </div>
    </div>
  )
}
