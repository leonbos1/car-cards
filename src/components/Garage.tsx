import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { formatEuros, quickSellValue } from '../game/economy'
import { ALL_CARDS } from '../game/pack'
import type { CardView } from '../types'
import { CarCard } from './CarCard'

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
      if (filter === 'all') return true
      if (filter === 'rare') return c.rare
      if (filter === 'special') return c.cardClass === 'special'
      return c.tier === filter && c.cardClass !== 'special'
    })
    return matches.sort((a, b) => {
      if (sort === 'name') return `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`)
      if (sort === 'owned') return (collection[b.id] ?? 0) - (collection[a.id] ?? 0)
      return b.overall - a.overall
    })
  }, [owned, filter, make, sort, collection])

  const duplicateValue = useMemo(
    () =>
      owned.reduce(
        (sum, c) => sum + quickSellValue(c) * Math.max(0, (collection[c.id] ?? 0) - 1),
        0,
      ),
    [owned, collection],
  )

  const completion = Math.round((owned.length / ALL_CARDS.length) * 100)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Garage</h2>
          <p className="text-sm text-white/45">
            {owned.length} of {ALL_CARDS.length} cars ({completion}%) · {packsOpened} packs opened
          </p>
        </div>

        {duplicateValue > 0 && (
          <div className="flex items-center gap-2">
            {confirming ? (
              <>
                <span className="text-xs text-white/50">
                  Sell all duplicates for {formatEuros(duplicateValue)}?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onSellDuplicates()
                    setConfirming(false)
                  }}
                  className="rounded-lg bg-gold-2 px-3 py-1.5 text-xs font-extrabold text-black"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20"
              >
                Quick-sell duplicates · {formatEuros(duplicateValue)}
              </button>
            )}
          </div>
        )}
      </div>

      {/* completion bar */}
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full bg-gold-2"
          initial={{ width: 0 }}
          animate={{ width: `${completion}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              filter === key ? 'bg-gold-2 text-black' : 'bg-white/8 text-white/60 hover:bg-white/15'
            }`}
          >
            {label}
          </button>
        ))}

        <select
          value={make}
          onChange={(e) => setMake(e.target.value)}
          className="ml-auto rounded-lg bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/80 outline-none"
        >
          {makes.map((m) => (
            <option key={m} value={m} className="bg-[#0b1120]">
              {m === 'all' ? 'All makes' : m}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="rounded-lg bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/80 outline-none"
        >
          <option value="rating" className="bg-[#0b1120]">Rating</option>
          <option value="name" className="bg-[#0b1120]">Name</option>
          <option value="owned" className="bg-[#0b1120]">Copies</option>
        </select>
      </div>

      {owned.length === 0 ? (
        <p className="py-20 text-center text-white/35">
          Nothing here yet. Open a pack in the store.
        </p>
      ) : (
        <div className="flex flex-wrap justify-center gap-5 sm:justify-start">
          {visible.map((card) => {
            const copies = collection[card.id] ?? 0
            return (
              <div key={card.id} className="relative">
                <CarCard card={card} scale={0.62} onClick={() => onInspect(card)} />
                {copies > 1 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-black/85 px-2 py-0.5 text-[11px] font-extrabold text-gold-2 ring-1 ring-gold-2/40">
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
