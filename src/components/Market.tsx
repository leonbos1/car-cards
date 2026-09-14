import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { bookValue, formatCountdown, formatEuros } from '../game/economy'
import { bidPrice, listings, nextRestockIn, priceMultiplier } from '../game/market'
import { ALL_CARDS } from '../game/pack'
import { useGame } from '../store/useGame'
import type { CardView } from '../types'
import { CLASS_COLORS } from './CarCard'

const CARD_BY_ID = new Map(ALL_CARDS.map((c) => [c.id, c]))

type Side = 'buy' | 'sell'

export function Market({ onInspect }: { onInspect: (card: CardView) => void }) {
  const balance = useGame((s) => s.balance)
  const collection = useGame((s) => s.collection)
  const boughtListings = useGame((s) => s.boughtListings)
  const buyListing = useGame((s) => s.buyListing)
  const sellToMarket = useGame((s) => s.sellToMarket)

  const [side, setSide] = useState<Side>('buy')
  // Re-render on the restock clock so the board and countdown stay honest.
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const board = useMemo(() => {
    void tick
    const sold = new Set(boughtListings)
    return listings().filter((l) => !sold.has(l.id))
  }, [boughtListings, tick])

  const duplicates = useMemo(() => {
    void tick
    return Object.entries(collection)
      .filter(([, n]) => n > 1)
      .map(([id, n]) => ({ card: CARD_BY_ID.get(id)!, spare: n - 1 }))
      .filter((row) => row.card)
      .sort((a, b) => bidPrice(b.card) - bidPrice(a.card))
  }, [collection, tick])

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-6">
      <h2 className="mb-1 text-2xl font-extrabold tracking-tight">Market</h2>
      <p className="mb-4 text-sm text-white/45">
        Dealers pay well above quick-sell, and prices move every day. Buy a car cheap and hold it
        until its price has a good day — buy and sell it back at once and you always lose the
        spread.
      </p>

      <div className="mb-5 flex gap-2">
        {(['buy', 'sell'] as Side[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={`rounded-xl px-4 py-2 text-sm font-bold capitalize transition ${
              side === s ? 'bg-white/15 text-white' : 'bg-white/5 text-white/45 hover:text-white/80'
            }`}
          >
            {s === 'buy' ? `Buy (${board.length})` : `Sell (${duplicates.length})`}
          </button>
        ))}
        {side === 'buy' && (
          <span className="ml-auto self-center text-xs text-white/35">
            New stock in {formatCountdown(nextRestockIn())}
          </span>
        )}
      </div>

      {side === 'buy' ? (
        board.length ? (
          <ul className="space-y-2">
            {board.map((listing) => {
              const today = Math.round(bookValue(listing.card) * priceMultiplier(listing.card.id))
              const over = Math.round((listing.deal - 1) * 100)
              const bargain = listing.deal < 0.97
              return (
                <Row
                  key={listing.id}
                  card={listing.card}
                  onInspect={onInspect}
                  note={
                    <>
                      worth {formatEuros(today)} today ·{' '}
                      {/* Spelling out the markup is the difference between a
                          market you can read and a row of numbers. */}
                      <span className={bargain ? 'font-bold text-emerald-400' : 'text-red-400'}>
                        {over > 0 ? `+${over}%` : `${over}%`}
                      </span>
                    </>
                  }
                  action={
                    <button
                      type="button"
                      disabled={balance < listing.price}
                      onClick={() => buyListing(listing.id)}
                      className="shrink-0 rounded-lg bg-gold-2 px-3 py-1.5 text-xs font-extrabold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                    >
                      {formatEuros(listing.price)}
                    </button>
                  }
                />
              )
            })}
          </ul>
        ) : (
          <Empty>Every car on the board has been bought. New stock arrives shortly.</Empty>
        )
      ) : duplicates.length ? (
        <ul className="space-y-2">
          {duplicates.map(({ card, spare }) => {
            const price = bidPrice(card)
            const move = priceMultiplier(card.id) - 1
            return (
              <Row
                key={card.id}
                card={card}
                onInspect={onInspect}
                note={
                  <>
                    {spare} spare ·{' '}
                    <span className={move >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {move >= 0 ? '▲' : '▼'} {Math.abs(move * 100).toFixed(0)}% today
                    </span>
                  </>
                }
                action={
                  <button
                    type="button"
                    onClick={() => sellToMarket(card.id)}
                    className="shrink-0 rounded-lg bg-gold-2 px-3 py-1.5 text-xs font-extrabold text-black transition hover:brightness-110"
                  >
                    Sell {formatEuros(price)}
                  </button>
                }
              />
            )
          })}
        </ul>
      ) : (
        <Empty>
          Nothing spare to sell. Duplicates from packs show up here — the market pays well over
          twice what quick-selling them does.
        </Empty>
      )}
    </div>
  )
}

function Row({
  card,
  note,
  action,
  onInspect,
}: {
  card: CardView
  note: React.ReactNode
  action: React.ReactNode
  onInspect: (card: CardView) => void
}) {
  const [, mid] = CLASS_COLORS[card.cardClass]
  return (
    <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
      <button
        type="button"
        onClick={() => onInspect(card)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-black text-black"
          style={{ background: mid }}
        >
          {card.overall}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold">
            {card.make} {card.model}
          </span>
          <span className="block truncate text-xs text-white/45">{note}</span>
        </span>
      </button>
      {action}
    </li>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/45"
    >
      {children}
    </motion.p>
  )
}
