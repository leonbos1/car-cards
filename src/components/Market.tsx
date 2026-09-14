import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { bookValue, formatCountdown, formatEuros } from '../game/economy'
import {
  contracts,
  matchesWant,
  nextContractsIn,
  type Contract,
} from '../game/contracts'
import { bidPrice, listings, nextRestockIn, pricingOf, priceMultiplier } from '../game/market'
import { ALL_CARDS } from '../game/pack'
import { useGame } from '../store/useGame'
import type { CardView } from '../types'
import { CLASS_COLORS } from './CarCard'

const CARD_BY_ID = new Map(ALL_CARDS.map((c) => [c.id, c]))

type Side = 'buy' | 'sell' | 'wanted'
type Filter = 'all' | 'spares' | 'bronze' | 'silver' | 'gold' | 'rare' | 'special'
type Sort = 'value' | 'rating' | 'name'

const FILTERS: [Filter, string][] = [
  ['all', 'All'],
  ['spares', 'Spares'],
  ['bronze', 'Bronze'],
  ['silver', 'Silver'],
  ['gold', 'Gold'],
  ['rare', 'Rare'],
  ['special', 'Special'],
]

export function Market({ onInspect }: { onInspect: (card: CardView) => void }) {
  const balance = useGame((s) => s.balance)
  const collection = useGame((s) => s.collection)
  const boughtListings = useGame((s) => s.boughtListings)
  const buyListing = useGame((s) => s.buyListing)
  const sellToMarket = useGame((s) => s.sellToMarket)
  const fulfilledContracts = useGame((s) => s.fulfilledContracts)
  const fulfilContract = useGame((s) => s.fulfilContract)

  const [side, setSide] = useState<Side>('buy')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('value')
  const [query, setQuery] = useState('')
  /** Car id whose last-copy sale is awaiting confirmation. */
  const [confirming, setConfirming] = useState<string | null>(null)

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

  /**
   * Everything owned, priced once.
   *
   * `bidPrice` hashes on every call, and this used to call it twice per car
   * inside the sort comparator and again for each row — fine for a handful of
   * duplicates, but this list now runs to every car you own, and it rebuilds
   * every thirty seconds and after every sale.
   */
  const stock = useMemo(() => {
    void tick
    return Object.entries(collection)
      .filter(([, n]) => n > 0)
      .flatMap(([id, copies]) => {
        const card = CARD_BY_ID.get(id)
        if (!card) return []
        return [{ card, copies, bid: bidPrice(card), move: priceMultiplier(card.id) - 1 }]
      })
  }, [collection, tick])

  const open = useMemo(() => {
    void tick
    const done = new Set(fulfilledContracts)
    return contracts().filter((c) => !done.has(c.id))
  }, [fulfilledContracts, tick])

  /**
   * The cheapest car you own that fits each request.
   *
   * Handing over the cheapest qualifying car is the good play, so the row
   * offers it directly rather than making you go and work it out.
   */
  const bestFor = useMemo(() => {
    const map = new Map<string, { card: CardView; bid: number }>()
    for (const contract of open) {
      let best: { card: CardView; bid: number } | undefined
      for (const row of stock) {
        if (!matchesWant(row.card, contract.want)) continue
        if (!best || row.bid < best.bid) best = { card: row.card, bid: row.bid }
      }
      if (best) map.set(contract.id, best)
    }
    return map
  }, [open, stock])

  const sellable = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const rows = stock.filter((row) => {
      if (needle && !`${row.card.make} ${row.card.model}`.toLowerCase().includes(needle)) {
        return false
      }
      if (filter === 'all') return true
      if (filter === 'spares') return row.copies > 1
      if (filter === 'rare') return row.card.rare
      if (filter === 'special') return row.card.cardClass === 'special'
      return row.card.tier === filter && row.card.cardClass !== 'special'
    })
    return rows.sort((a, b) => {
      if (sort === 'rating') return b.card.overall - a.card.overall
      if (sort === 'name') {
        return `${a.card.make} ${a.card.model}`.localeCompare(`${b.card.make} ${b.card.model}`)
      }
      return b.bid - a.bid
    })
  }, [stock, filter, sort, query])

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-6">
      <h2 className="mb-1 text-2xl font-extrabold tracking-tight">Market</h2>
      <p className="mb-4 text-sm text-white/45">
        Dealers pay well above quick-sell, and prices move every day. Buy a car cheap and hold it
        until its price has a good day — buy and sell it back at once and you always lose the
        spread.
      </p>

      <div className="mb-5 flex gap-2">
        {(['buy', 'sell', 'wanted'] as Side[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={`rounded-xl px-4 py-2 text-sm font-bold capitalize transition ${
              side === s ? 'bg-white/15 text-white' : 'bg-white/5 text-white/45 hover:text-white/80'
            }`}
          >
            {s === 'buy'
              ? `Buy (${board.length})`
              : s === 'sell'
                ? `Sell (${stock.length})`
                : `Wanted (${open.length})`}
          </button>
        ))}
        {side !== 'sell' && (
          <span className="ml-auto self-center text-xs text-white/35">
            {side === 'buy'
              ? `New stock in ${formatCountdown(nextRestockIn())}`
              : `New requests in ${formatCountdown(nextContractsIn())}`}
          </span>
        )}
      </div>

      {side === 'wanted' ? (
        open.length ? (
          <>
            <p className="mb-4 text-sm text-white/45">
              Buyers pay over the odds for a car that fits. The car goes to them, so the trick is
              working out the cheapest thing you own that still qualifies.
            </p>
            <ul className="space-y-2">
              {open.map((contract) => (
                <ContractRow
                  key={contract.id}
                  contract={contract}
                  best={bestFor.get(contract.id)}
                  onInspect={onInspect}
                  onFulfil={(carId) => fulfilContract(contract.id, carId)}
                />
              ))}
            </ul>
          </>
        ) : (
          <Empty>Every request filled. New ones arrive in {formatCountdown(nextContractsIn())}.</Empty>
        )
      ) : side === 'buy' ? (
        board.length ? (
          <ul className="space-y-2">
            {board.map((listing) => {
              const today = Math.round(bookValue(listing.card) * priceMultiplier(listing.card.id))
              const over = Math.round((listing.deal - 1) * 100)
              const pricing = pricingOf(listing.deal)
              const tone =
                pricing === 'keen'
                  ? 'text-emerald-400'
                  : pricing === 'steep'
                    ? 'text-red-400'
                    : 'text-white/40'
              return (
                <Row
                  key={listing.id}
                  card={listing.card}
                  onInspect={onInspect}
                  note={<>worth {formatEuros(today)} today</>}
                  action={
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <button
                        type="button"
                        disabled={balance < listing.price}
                        onClick={() => buyListing(listing.id)}
                        className="rounded-lg bg-gold-2 px-3 py-1.5 text-xs font-extrabold tabular-nums text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                      >
                        {formatEuros(listing.price)}
                      </button>
                      {/* The markup lives out here rather than in the note: it is
                          the one thing this screen exists to tell you, and inside
                          a truncating line a six-figure price would eat it. */}
                      <span className={`text-[11px] font-bold tabular-nums ${tone}`}>
                        {over > 0 ? `+${over}%` : `${over}%`}
                      </span>
                    </div>
                  }
                />
              )
            })}
          </ul>
        ) : (
          <Empty>Every car on the board has been bought. New stock arrives shortly.</Empty>
        )
      ) : stock.length ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  filter === key
                    ? 'bg-gold-2 text-black'
                    : 'bg-white/8 text-white/60 hover:bg-white/15'
                }`}
              >
                {label}
              </button>
            ))}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="ml-auto rounded-lg bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/80 outline-none"
            >
              <option value="value" className="bg-[#0b1120]">Value</option>
              <option value="rating" className="bg-[#0b1120]">Rating</option>
              <option value="name" className="bg-[#0b1120]">Name</option>
            </select>
          </div>

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your cars"
            className="mb-4 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
          />

          {sellable.length ? (
            <ul className="space-y-2">
              {sellable.map(({ card, copies, bid, move }) => {
                const last = copies === 1
                const asking = confirming === card.id
                return (
                  <Row
                    key={card.id}
                    card={card}
                    onInspect={onInspect}
                    note={<>{last ? 'Your only copy' : `${copies} copies`}</>}
                    footer={
                      asking ? (
                        <p className="mt-2 text-xs text-amber-300">
                          This is your only {card.make} {card.model}. Selling it takes the car out
                          of your collection.
                        </p>
                      ) : undefined
                    }
                    action={
                      asking ? (
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              sellToMarket(card.id)
                              setConfirming(null)
                            }}
                            className="rounded-lg bg-gold-2 px-3 py-1.5 text-xs font-extrabold tabular-nums text-black transition hover:brightness-110"
                          >
                            Sell anyway
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirming(null)}
                            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/20"
                          >
                            Keep
                          </button>
                        </div>
                      ) : (
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <button
                            type="button"
                            // Selling a spare is one click. Parting with the only
                            // copy you own is not something to do by mis-tap.
                            onClick={() =>
                              last ? setConfirming(card.id) : sellToMarket(card.id)
                            }
                            className="rounded-lg bg-gold-2 px-3 py-1.5 text-xs font-extrabold tabular-nums text-black transition hover:brightness-110"
                          >
                            Sell {formatEuros(bid)}
                          </button>
                          <span
                            className={`text-[11px] font-bold tabular-nums ${
                              move >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {move >= 0 ? '▲' : '▼'} {Math.abs(move * 100).toFixed(0)}% today
                          </span>
                        </div>
                      )
                    }
                  />
                )
              })}
            </ul>
          ) : (
            <Empty>No car you own matches that.</Empty>
          )}
        </>
      ) : (
        <Empty>
          Nothing to sell yet. Cars you pull from packs show up here — the market pays well over
          twice what quick-selling them does.
        </Empty>
      )}
    </div>
  )
}

function ContractRow({
  contract,
  best,
  onFulfil,
  onInspect,
}: {
  contract: Contract
  best?: { card: CardView; bid: number }
  onFulfil: (carId: string) => void
  onInspect: (card: CardView) => void
}) {
  const [confirming, setConfirming] = useState(false)
  // Worth doing only if the fee beats what a dealer would pay for the same car.
  const gain = best ? contract.reward - best.bid : 0

  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">{contract.label}</div>
          <div className="text-xs text-white/45">
            {best ? (
              <>
                you have{' '}
                <button
                  type="button"
                  onClick={() => onInspect(best.card)}
                  className="font-semibold text-white/70 underline decoration-white/20 underline-offset-2"
                >
                  {best.card.make} {best.card.model}
                </button>{' '}
                · worth {formatEuros(best.bid)} to a dealer
              </>
            ) : (
              'nothing in your garage fits this one yet'
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {confirming && best ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onFulfil(best.card.id)
                  setConfirming(false)
                }}
                className="rounded-lg bg-gold-2 px-3 py-1.5 text-xs font-extrabold text-black transition hover:brightness-110"
              >
                Hand it over
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/20"
              >
                Keep
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={!best}
                onClick={() => setConfirming(true)}
                className="rounded-lg bg-gold-2 px-3 py-1.5 text-xs font-extrabold tabular-nums text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
              >
                {formatEuros(contract.reward)}
              </button>
              {best && (
                <span
                  className={`text-[11px] font-bold tabular-nums ${
                    gain > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {gain > 0 ? '+' : ''}
                  {formatEuros(gain)} vs dealer
                </span>
              )}
            </>
          )}
        </div>
      </div>
      {confirming && best && (
        <p className="mt-2 text-xs text-amber-300">
          Hands over your {best.card.make} {best.card.model}. It leaves your collection.
        </p>
      )}
    </li>
  )
}

function Row({
  card,
  note,
  action,
  footer,
  onInspect,
}: {
  card: CardView
  note: React.ReactNode
  action: React.ReactNode
  /** Full-width line under the row, for anything that must not be truncated. */
  footer?: React.ReactNode
  onInspect: (card: CardView) => void
}) {
  const [, mid] = CLASS_COLORS[card.cardClass]
  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
      <div className="flex items-center gap-3">
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
      </div>
      {footer}
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
