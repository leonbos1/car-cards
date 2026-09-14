import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import {
  LADDER,
  MARQUE_PACKS,
  MARQUE_PACK_PRICE,
  MARQUE_PACK_SIZE,
  MARQUE_PACK_SLOTS,
  contentsLine,
  tierBreakdown,
} from '../data/packs'
import { formatCountdown, formatEuros } from '../game/economy'
import { ALL_CARDS } from '../game/pack'
import { useGame } from '../store/useGame'
import type { Pack } from '../types'
import { BrandBadge } from './BrandBadge'
import { CLASS_COLORS } from './CarCard'

interface Props {
  balance: number
  /** Milliseconds until the free pack returns; 0 when it is ready. */
  freeReadyIn: number
  /** The one-off welcome pack disappears once taken. */
  welcomeClaimed: boolean
  onBuy: (pack: Pack) => void
}

export function PackStore({ balance, freeReadyIn, welcomeClaimed, onBuy }: Props) {
  // The countdown has to move on its own, so tick while a pack is on cooldown.
  const [, setNow] = useState(0)
  useEffect(() => {
    if (freeReadyIn <= 0) return
    const id = setInterval(() => setNow((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [freeReadyIn])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6">
      <h2 className="mb-1 text-2xl font-extrabold tracking-tight">Store</h2>
      <p className="mb-6 text-sm text-white/45">
        Every pack lists what it deals and the rating it caps out at. Packs cost more than their
        cars are worth — they are how you find cars, not how you make money.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LADDER.filter((pack) => !(pack.once && welcomeClaimed)).map((pack) => (
          <PackTile
            key={pack.id}
            pack={pack}
            locked={pack.once ? false : pack.free ? freeReadyIn > 0 : balance < pack.price}
            waitLabel={pack.free && !pack.once && freeReadyIn > 0 ? formatCountdown(freeReadyIn) : null}
            onBuy={onBuy}
          />
        ))}
      </div>

      <MarquePacks balance={balance} onBuy={onBuy} />
    </div>
  )
}

/**
 * One pack per marque, all at the same price.
 *
 * Shown apart from the ladder and as a list rather than as twenty more tiles:
 * these are not steps up from each other, they are the same pack aimed at
 * different brands, and the thing a player is choosing between is which brand
 * they want — so the badge, the marque and how much of it you already hold are
 * what each row leads with.
 */
function MarquePacks({ balance, onBuy }: { balance: number; onBuy: (p: Pack) => void }) {
  const collection = useGame((s) => s.collection)
  // Every marque pack is built from one template, so any of them describes all.
  const spec = MARQUE_PACKS[0]

  const rows = useMemo(
    () =>
      MARQUE_PACKS.map((pack) => {
        const cars = ALL_CARDS.filter((c) => c.make === pack.make)
        return {
          pack,
          total: cars.length,
          owned: cars.filter((c) => (collection[c.id] ?? 0) > 0).length,
          // What this pack can actually reach, which is not the marque's best
          // car when its best car sits above the cap.
          reach: Math.max(
            ...cars
              .filter((c) => !c.special && c.overall <= (pack.maxOverall ?? 99))
              .map((c) => c.overall),
          ),
        }
      }),
    [collection],
  )

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-extrabold tracking-tight">Marque packs</h2>
      {/* Read off a real pack, so what is advertised here cannot drift from
          what the packs deal — the same rule the odds panel above follows. */}
      <p className="mb-1 mt-1 text-sm text-white/45">
        {formatEuros(MARQUE_PACK_PRICE)} each. {MARQUE_PACK_SIZE} gold cars, at least{' '}
        {MARQUE_PACK_SLOTS} of them from the marque. {spec.guaranteedRare} guaranteed rare, then{' '}
        {(spec.rareChance * 100).toFixed(0)}% on the rest, one card rated{' '}
        {spec.headlinerMinOverall}+, nothing above {spec.maxOverall}, and no specials.
      </p>
      <p className="mb-4 text-xs text-white/35">
        The supercar marques have no pack — too few of their cars sit under the rating cap. Those
        you buy on the market, one at a time.
      </p>

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ pack, owned, total, reach }) => {
          const afford = balance >= pack.price
          return (
            <li key={pack.id}>
              <button
                type="button"
                disabled={!afford}
                onClick={() => onBuy(pack)}
                className={`flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition ${
                  afford ? 'hover:border-gold-2/50 hover:bg-white/[0.06]' : 'opacity-45'
                }`}
              >
                <BrandBadge make={pack.make!} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{pack.make}</span>
                  <span className="block text-xs text-white/45">
                    <span className="tabular-nums">
                      {owned} of {total}
                    </span>{' '}
                    collected · best {reach}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-extrabold tabular-nums ${
                    afford ? 'bg-gold-2 text-black' : 'bg-white/10 text-white/40'
                  }`}
                >
                  {formatEuros(pack.price)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function PackTile({
  pack,
  locked,
  waitLabel,
  onBuy,
}: {
  pack: Pack
  locked: boolean
  waitLabel: string | null
  onBuy: (p: Pack) => void
}) {
  const [showOdds, setShowOdds] = useState(false)
  const [deep, mid, light] = CLASS_COLORS[pack.art]

  const buttonLabel = pack.once
    ? 'Open your welcome pack'
    : pack.free
    ? waitLabel
      ? `Back in ${waitLabel}`
      : 'Open free pack'
    : locked
      ? `Need ${formatEuros(pack.price)}`
      : formatEuros(pack.price)

  return (
    <motion.div
      layout
      className={`overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] ${
        locked ? 'opacity-45' : ''
      }`}
      whileHover={locked ? undefined : { y: -3 }}
    >
      <div
        className="relative h-28 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${deep} 0%, ${mid} 55%, ${light} 130%)` }}
      >
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              'repeating-linear-gradient(115deg, rgba(255,255,255,.1) 0 12px, transparent 12px 30px)',
          }}
        />
        <div className="absolute inset-0 flex items-end p-4">
          <h3
            className="text-lg font-extrabold uppercase leading-tight tracking-wide"
            style={{ color: pack.art === 'special' ? '#ffe6a3' : deep }}
          >
            {pack.name}
          </h3>
        </div>
      </div>

      <div className="p-4">
        <p className="text-sm font-semibold text-white/75">{contentsLine(pack)}</p>
        <p className="mb-3 mt-1 text-xs text-white/45">{pack.blurb}</p>

        <button
          type="button"
          onClick={() => setShowOdds((s) => !s)}
          className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/40 hover:text-white/70"
        >
          {showOdds ? 'Hide odds' : 'View odds'}
        </button>

        {showOdds && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-3 space-y-1 overflow-hidden rounded-lg bg-black/30 p-3 text-xs"
          >
            {/* Read straight off the pack's slots, so this cannot drift. */}
            {tierBreakdown(pack).map(({ tier, count }) => (
              <Row key={tier} label={`${tier[0].toUpperCase()}${tier.slice(1)}`}>
                {count} of {pack.tiers.length}
              </Row>
            ))}
            <Row label="Rare">
              {pack.allRare
                ? 'every card'
                : pack.guaranteedRare > 0
                  ? `${pack.guaranteedRare} guaranteed, then ${(pack.rareChance * 100).toFixed(0)}%`
                  : `${(pack.rareChance * 100).toFixed(0)}%`}
            </Row>
            {pack.minOverall !== undefined && <Row label="Rating floor">{pack.minOverall}+</Row>}
            {pack.maxOverall !== undefined && <Row label="Rating cap">{pack.maxOverall}</Row>}
            {pack.headlinerMinOverall !== undefined && (
              <Row label="Best card">{pack.headlinerMinOverall}+ guaranteed</Row>
            )}
            <Row label="Special">
              {pack.specialChance > 0 ? `${(pack.specialChance * 100).toFixed(1)}%` : 'never'}
            </Row>
          </motion.ul>
        )}

        <button
          type="button"
          disabled={locked}
          onClick={() => onBuy(pack)}
          className="w-full rounded-xl bg-gold-2 py-2.5 text-sm font-extrabold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
        >
          {buttonLabel}
        </button>
      </div>
    </motion.div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex justify-between gap-3 text-white/60">
      <span>{label}</span>
      <span className="tabular-nums font-semibold text-white/85">{children}</span>
    </li>
  )
}
