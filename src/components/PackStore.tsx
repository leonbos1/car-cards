import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { PACKS, contentsLine, tierBreakdown } from '../data/packs'
import { formatCountdown, formatEuros } from '../game/economy'
import type { Pack } from '../types'
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
        {PACKS.filter((pack) => !(pack.once && welcomeClaimed)).map((pack) => (
          <PackTile
            key={pack.id}
            pack={pack}
            locked={pack.once ? false : pack.free ? freeReadyIn > 0 : balance < pack.price}
            waitLabel={pack.free && !pack.once && freeReadyIn > 0 ? formatCountdown(freeReadyIn) : null}
            onBuy={onBuy}
          />
        ))}
      </div>
    </div>
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
