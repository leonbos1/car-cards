import { motion } from 'framer-motion'
import { useState } from 'react'
import { PACKS } from '../data/packs'
import { formatEuros } from '../game/economy'
import type { Pack } from '../types'
import { CLASS_COLORS } from './CarCard'

interface Props {
  balance: number
  onBuy: (pack: Pack) => void
}

export function PackStore({ balance, onBuy }: Props) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6">
      <h2 className="mb-1 text-2xl font-extrabold tracking-tight">Store</h2>
      <p className="mb-6 text-sm text-white/45">
        Every pack lists its real drop rates. Nothing is hidden.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PACKS.map((pack) => (
          <PackTile key={pack.id} pack={pack} affordable={balance >= pack.price} onBuy={onBuy} />
        ))}
      </div>
    </div>
  )
}

function PackTile({
  pack,
  affordable,
  onBuy,
}: {
  pack: Pack
  affordable: boolean
  onBuy: (p: Pack) => void
}) {
  const [showOdds, setShowOdds] = useState(false)
  const [deep, mid, light] = CLASS_COLORS[pack.art]

  return (
    <motion.div
      layout
      className={`overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] ${
        affordable ? '' : 'opacity-45'
      }`}
      whileHover={affordable ? { y: -3 } : undefined}
    >
      {/* pack artwork */}
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
        <p className="mb-3 text-sm text-white/60">{pack.odds.contents}</p>

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
            {pack.odds.rates.map((rate) => (
              <li key={rate.label} className="flex justify-between text-white/60">
                <span>{rate.label}</span>
                <span className="tabular-nums font-semibold text-white/85">
                  {(rate.chance * 100).toFixed(rate.chance < 0.1 ? 1 : 0)}%
                </span>
              </li>
            ))}
          </motion.ul>
        )}

        <button
          type="button"
          disabled={!affordable}
          onClick={() => onBuy(pack)}
          className="w-full rounded-xl bg-gold-2 py-2.5 text-sm font-extrabold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
        >
          {affordable ? formatEuros(pack.price) : `Need ${formatEuros(pack.price)}`}
        </button>
      </div>
    </motion.div>
  )
}
