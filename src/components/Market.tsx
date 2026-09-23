import { motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CarFront,
  Handshake,
  Lock,
  PackageOpen,
  Search,
  ShoppingCart,
  Tag,
  Timer,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import IMAGES from '../data/car-images.json'
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
import { PageHeader } from './ui/PageHeader'
import { SubTabs } from './ui/SubTabs'

const CARD_BY_ID = new Map(ALL_CARDS.map((c) => [c.id, c]))

const images = IMAGES as Record<string, { file: string }>

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
    <div className="w-full">
      <PageHeader
        eyebrow="Transfer market"
        title="Market"
        subtitle={
          <>
            Dealers pay well above quick-sell, and prices move every day. Buy a car cheap and hold
            it until its price has a good day — buy and sell it back at once and you always lose
            the spread.
          </>
        }
      />

      <SubTabs<Side>
        className="mb-4"
        value={side}
        onChange={setSide}
        tabs={[
          { id: 'buy', label: `Buy · ${board.length}`, icon: ShoppingCart },
          { id: 'sell', label: `Sell · ${stock.length}`, icon: Tag },
          { id: 'wanted', label: `Wanted · ${open.length}`, icon: Handshake },
        ]}
      />

      {side !== 'sell' && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Countdown
            label={side === 'buy' ? 'New stock in' : 'New requests in'}
            value={formatCountdown(side === 'buy' ? nextRestockIn() : nextContractsIn())}
          />
          {side === 'buy' && (
            <p className="flex items-baseline gap-2">
              <span className="eyebrow">Funds</span>
              <span className="num text-xl leading-none text-gold-2">{formatEuros(balance)}</span>
            </p>
          )}
        </div>
      )}

      {side === 'wanted' ? (
        open.length ? (
          <>
            <p className="mb-4 max-w-2xl text-sm leading-relaxed text-white/55">
              Buyers pay over the odds for a car that fits. The car goes to them, so the trick is
              working out the cheapest thing you own that still qualifies.
            </p>
            <ul className="grid gap-3 lg:grid-cols-2">
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
          <ul className="grid gap-3 md:grid-cols-2">
            {board.map((listing) => {
              const today = Math.round(bookValue(listing.card) * priceMultiplier(listing.card.id))
              const over = Math.round((listing.deal - 1) * 100)
              const pricing = pricingOf(listing.deal)
              const short = listing.price - balance
              const affordable = short <= 0
              return (
                <Row
                  key={listing.id}
                  card={listing.card}
                  onInspect={onInspect}
                  note={<>worth {formatEuros(today)} today</>}
                  meta={
                    <div className="flex min-w-0 flex-col items-start gap-1">
                      {/* The markup lives out here rather than in the note: it is
                          the one thing this screen exists to tell you, and inside
                          a truncating line a six-figure price would eat it. */}
                      <PricingTag pricing={pricing} over={over} />
                      {!affordable && (
                        <span className="num text-xs leading-none text-signal">
                          {formatEuros(short)} short
                        </span>
                      )}
                    </div>
                  }
                  action={
                    <button
                      type="button"
                      disabled={!affordable}
                      onClick={() => buyListing(listing.id)}
                      aria-label={`Buy ${listing.card.make} ${listing.card.model} for ${formatEuros(listing.price)}`}
                      className={`btn min-w-[8.5rem] shrink-0 ${affordable ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {affordable ? (
                        <ShoppingCart size={16} strokeWidth={2.6} aria-hidden />
                      ) : (
                        <Lock size={15} strokeWidth={2.6} aria-hidden />
                      )}
                      <span className="num text-lg not-italic leading-none">
                        {formatEuros(listing.price)}
                      </span>
                    </button>
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
          <div className="mb-4 space-y-3">
            <div className="flex gap-2">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Search your cars</span>
                <Search
                  size={17}
                  strokeWidth={2.4}
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your cars"
                  className="field w-full pl-9 placeholder:text-white/35"
                />
              </label>
              <label className="shrink-0">
                <span className="sr-only">Sort by</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="field h-full font-display font-bold uppercase tracking-wide"
                >
                  <option value="value" className="bg-asphalt">Value</option>
                  <option value="rating" className="bg-asphalt">Rating</option>
                  <option value="name" className="bg-asphalt">Name</option>
                </select>
              </label>
            </div>

            {/* One swipeable line on a phone rather than two ragged rows of pills. */}
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
              {FILTERS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                  className={`chip shrink-0 ${filter === key ? 'chip-on' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {sellable.length ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {sellable.map(({ card, copies, bid, move }) => {
                const last = copies === 1
                const asking = confirming === card.id
                return (
                  <Row
                    key={card.id}
                    card={card}
                    onInspect={onInspect}
                    note={
                      last ? (
                        <span className="text-amber-300/90">Your only copy</span>
                      ) : (
                        <>{copies} copies</>
                      )
                    }
                    footer={
                      asking ? (
                        <div className="space-y-3 border-t border-signal/25 bg-signal/[0.07] p-3">
                          <p className="flex gap-2 text-sm leading-snug text-amber-200">
                            <AlertTriangle
                              size={17}
                              strokeWidth={2.4}
                              aria-hidden
                              className="mt-0.5 shrink-0 text-amber-300"
                            />
                            <span>
                              This is your only {card.make} {card.model}. Selling it takes the car
                              out of your collection.
                            </span>
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                sellToMarket(card.id)
                                setConfirming(null)
                              }}
                              className="btn btn-danger flex-1"
                            >
                              Sell anyway
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirming(null)}
                              className="btn btn-secondary flex-1"
                            >
                              Keep
                            </button>
                          </div>
                        </div>
                      ) : undefined
                    }
                    meta={
                      asking ? undefined : (
                        <span
                          className={`num flex items-center gap-1 text-sm leading-none ${
                            move >= 0 ? 'text-go' : 'text-signal'
                          }`}
                        >
                          {move >= 0 ? (
                            <ArrowUpRight size={16} strokeWidth={2.8} aria-hidden />
                          ) : (
                            <ArrowDownRight size={16} strokeWidth={2.8} aria-hidden />
                          )}
                          <span className="sr-only">{move >= 0 ? 'Up' : 'Down'}</span>
                          {Math.abs(move * 100).toFixed(0)}% today
                        </span>
                      )
                    }
                    action={
                      asking ? undefined : (
                        <button
                          type="button"
                          // Selling a spare is one click. Parting with the only
                          // copy you own is not something to do by mis-tap.
                          onClick={() => (last ? setConfirming(card.id) : sellToMarket(card.id))}
                          aria-label={`Sell ${card.make} ${card.model} for ${formatEuros(bid)}`}
                          className="btn btn-secondary min-w-[8.5rem] shrink-0"
                        >
                          Sell
                          <span className="num text-lg not-italic leading-none text-gold-2">
                            {formatEuros(bid)}
                          </span>
                        </button>
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
    <li className="panel-cut relative flex flex-col overflow-hidden">
      {/* A gold rail down the side marks a request you can fill right now. */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 ${best ? 'bg-gold-2 shadow-[0_0_14px_rgb(232_194_90/0.6)]' : 'bg-white/10'}`}
      />
      <div className="flex items-start justify-between gap-4 p-4 pl-5">
        <div className="min-w-0">
          <p className="eyebrow mb-1">Buyer request</p>
          <h3 className="headline text-2xl leading-tight">{contract.label}</h3>
        </div>
        <div className="shrink-0 text-right">
          <p className="eyebrow mb-1">Reward</p>
          <p className="num text-3xl leading-none text-gold-2 [text-shadow:0_0_18px_rgb(232_194_90/0.35)]">
            {formatEuros(contract.reward)}
          </p>
        </div>
      </div>

      <div className="mx-4 ml-5 border-t border-white/[0.07] pt-3">
        {best ? (
          <>
            <p className="eyebrow mb-2">You have</p>
            <button
              type="button"
              onClick={() => onInspect(best.card)}
              className="group flex min-h-11 w-full items-center gap-3 rounded-lg text-left"
            >
              <Thumb card={best.card} small />
              <span className="min-w-0 flex-1">
                <CarName card={best.card} />
                <span className="block truncate text-sm text-white/55">
                  worth {formatEuros(best.bid)} to a dealer
                </span>
              </span>
            </button>
          </>
        ) : (
          <p className="flex min-h-11 items-center gap-2 text-sm text-white/45">
            <PackageOpen size={18} strokeWidth={2.2} aria-hidden className="shrink-0" />
            nothing in your garage fits this one yet
          </p>
        )}
      </div>

      <div className="mt-auto p-4 pl-5 pt-3">
        {confirming && best ? (
          <div className="space-y-3">
            <p className="flex gap-2 text-sm leading-snug text-amber-200">
              <AlertTriangle
                size={17}
                strokeWidth={2.4}
                aria-hidden
                className="mt-0.5 shrink-0 text-amber-300"
              />
              <span>
                Hands over your {best.card.make} {best.card.model}. It leaves your collection.
              </span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onFulfil(best.card.id)
                  setConfirming(false)
                }}
                className="btn btn-danger flex-1"
              >
                Hand it over
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="btn btn-secondary flex-1"
              >
                Keep
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {best ? (
              <span
                className={`num text-base leading-none ${gain > 0 ? 'text-go' : 'text-signal'}`}
              >
                {gain > 0 ? '+' : ''}
                {formatEuros(gain)} <span className="font-semibold text-white/45">vs dealer</span>
              </span>
            ) : (
              <span />
            )}
            <button
              type="button"
              disabled={!best}
              onClick={() => setConfirming(true)}
              aria-label={`Fulfil request for ${formatEuros(contract.reward)}`}
              className={`btn grow sm:grow-0 ${best ? 'btn-primary' : 'btn-secondary'}`}
            >
              {best ? (
                <Handshake size={17} strokeWidth={2.4} aria-hidden />
              ) : (
                <Lock size={15} strokeWidth={2.6} aria-hidden />
              )}
              Fulfil
              <span className="num not-italic">{formatEuros(contract.reward)}</span>
            </button>
          </div>
        )}
      </div>
    </li>
  )
}

/**
 * One car on the board: the photo and name up top (tap to inspect), and a
 * bar underneath with the one number that matters and the button that acts
 * on it. Stacked rather than side by side so a phone never has to squeeze a
 * name, a markup and a six-figure price onto one line.
 */
function Row({
  card,
  note,
  meta,
  action,
  footer,
  onInspect,
}: {
  card: CardView
  note: React.ReactNode
  /** Left side of the action bar: markup, price move. */
  meta?: React.ReactNode
  action?: React.ReactNode
  /** Full-width line under the row, for anything that must not be truncated. */
  footer?: React.ReactNode
  onInspect: (card: CardView) => void
}) {
  const [, mid] = CLASS_COLORS[card.cardClass]
  return (
    <li className="panel relative flex flex-col overflow-hidden">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: mid }} />
      <button
        type="button"
        onClick={() => onInspect(card)}
        className="group flex min-h-11 min-w-0 items-center gap-3 p-3 pl-4 text-left transition-colors hover:bg-white/[0.03]"
      >
        <Thumb card={card} />
        <span className="min-w-0 flex-1">
          <CarName card={card} />
          <span className="block truncate text-sm text-white/55">{note}</span>
        </span>
      </button>
      {(meta || action) && (
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/[0.06] bg-black/25 py-2.5 pl-4 pr-3">
          {meta ?? <span />}
          {action}
        </div>
      )}
      {footer}
    </li>
  )
}

/** Make as a small caps line over the model, so the model is what gets cut short. */
function CarName({ card }: { card: CardView }) {
  return (
    <>
      <span className="block truncate font-display text-xs font-bold uppercase tracking-[0.14em] text-white/50">
        {card.make}
      </span>
      <span className="block truncate font-display text-lg font-bold uppercase italic leading-tight text-white group-hover:text-gold-3">
        {card.model}
      </span>
    </>
  )
}

/** The car's photo with its rating stamped on in the tier colour. */
function Thumb({ card, small = false }: { card: CardView; small?: boolean }) {
  const [deep, mid, light] = CLASS_COLORS[card.cardClass]
  const special = card.cardClass === 'special'
  const image = images[card.id]
  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-md bg-asphalt-3 ${small ? 'h-11 w-16' : 'h-14 w-20'}`}
      style={{ boxShadow: `inset 0 0 0 1px ${special ? '#c9a227' : mid}` }}
    >
      {image ? (
        <img
          src={`${import.meta.env.BASE_URL}cars/${image.file}`}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <CarFront
          size={small ? 20 : 24}
          strokeWidth={1.8}
          aria-hidden
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/20"
        />
      )}
      <span
        className={`num absolute bottom-0 left-0 grid place-items-center leading-none ${small ? 'h-5 min-w-7 px-1 text-sm' : 'h-6 min-w-8 px-1.5 text-base'}`}
        style={{
          background: special ? `linear-gradient(135deg, #2b1030, ${mid})` : `linear-gradient(135deg, ${light}, ${mid})`,
          color: special ? '#ffd98a' : deep,
          clipPath: 'polygon(0 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
          paddingRight: small ? 8 : 10,
        }}
      >
        {card.overall}
      </span>
      {card.rare && (
        <span className="tag absolute right-0 top-0 !px-1.5 !py-0 !text-[10px]">Rare</span>
      )}
    </span>
  )
}

function PricingTag({ pricing, over }: { pricing: 'keen' | 'fair' | 'steep'; over: number }) {
  const style =
    pricing === 'keen'
      ? 'bg-go/15 text-go'
      : pricing === 'steep'
        ? 'bg-signal/15 text-signal'
        : 'bg-white/[0.07] text-white/60'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-1.5 py-1 leading-none ${style}`}>
      <span className="font-display text-xs font-bold uppercase tracking-wider">{pricing}</span>
      <span className="num text-sm">{over > 0 ? `+${over}%` : `${over}%`}</span>
    </span>
  )
}

/** A live timing readout: pulsing dot, label, time left. */
function Countdown({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-center gap-2.5">
      <span className="relative grid size-8 place-items-center rounded-full border border-white/10 bg-black/40 text-gold-2">
        <Timer size={16} strokeWidth={2.4} aria-hidden />
        <span className="absolute -right-0.5 -top-0.5 size-2 animate-pulse-soft rounded-full bg-go shadow-[0_0_8px_var(--color-go)]" />
      </span>
      <span className="eyebrow">{label}</span>
      <span className="num text-xl leading-none text-white">{value}</span>
    </p>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.p
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      className="panel px-6 py-10 text-center text-sm leading-relaxed text-white/55"
    >
      {children}
    </motion.p>
  )
}
