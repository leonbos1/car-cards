import { bookValue } from './economy'
import { ALL_CARDS } from './pack'
import type { CardView } from '../types'

/**
 * A market of bots you can buy cars from and sell cars to.
 *
 * The one rule that keeps it honest: a bot will never pay you more than it
 * charges for the same car at the same moment. Bid sits below ask, always, so
 * buying a car and immediately selling it back always loses money. Without that
 * spread the market is a money printer and nothing else in the economy matters.
 *
 * Profit comes from two places instead. Bots price their listings unevenly, so
 * some are genuine bargains worth flipping and some are overpriced traps. And
 * every car's price drifts from day to day, so a car bought cheap is worth
 * holding until its marque has a good day.
 */

/** Bots buy at this fraction of book value — their margin for taking it. */
export const BID_RATE = 0.92
/**
 * What a bot pays for a hypercar, as a fraction of book.
 *
 * A dealer will take a hot hatch off your hands at close to book because it
 * sells next week; a seven-figure exotic sits on the forecourt for months, and
 * the margin reflects that. It is also what stops supercar flipping becoming
 * the only sensible way to play: at a flat 92% the best-case round trip on a
 * €100.000 car returns about a quarter of its value, which dwarfs every other
 * source of income in the game.
 */
export const EXOTIC_BID_RATE = 0.78
/** The taper starts above the dearest card any pack can deal (a 92 rare). */
const EXOTIC_FROM = 3_000
const EXOTIC_FULL = 40_000
/** The mid-point bots ask. Individual listings vary either side of it. */
export const ASK_RATE = 1.12

/**
 * How keen or greedy an individual listing can be, either side of the ask.
 * SKEW_MIN is load-bearing: ASK_RATE * SKEW_MIN must stay above BID_RATE or
 * the cheapest listings become free money, and `market.test.ts` checks it.
 */
export const SKEW_MIN = 0.87
export const SKEW_MAX = 1.3

/** How far a car's price can drift from book value on a given day. */
const DAILY_SWING = 0.16

export const LISTING_COUNT = 10
/** New stock arrives this often, which is what paces trading profit. */
export const RESTOCK_MS = 20 * 60 * 1000

/**
 * Deterministic hash, so a price depends only on the car and the day.
 *
 * The trailing avalanche is not optional. FNV alone propagates bits upward
 * only, and this reads the top bits as a fraction — so keys differing in their
 * last character, which is exactly how the slot keys are built, came out nearly
 * equal. Every listing on a board ended up with the same markup: ten bargains,
 * then ten traps, instead of a board worth reading.
 */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h ^= h >>> 16
  h = Math.imul(h, 2246822507)
  h ^= h >>> 13
  h = Math.imul(h, 3266489909)
  h ^= h >>> 16
  return (h >>> 0) / 0x100000000
}

/** Whole days since the epoch — the clock the market prices run on. */
export function marketDay(now = Date.now()): number {
  return Math.floor(now / 86_400_000)
}

/** Which batch of listings is on the board right now. */
export function restockWindow(now = Date.now()): number {
  return Math.floor(now / RESTOCK_MS)
}

export function nextRestockIn(now = Date.now()): number {
  return RESTOCK_MS - (now % RESTOCK_MS)
}

/**
 * Today's price movement for one car, as a multiplier around book value.
 *
 * Derived from the car and the date rather than stored, so every player sees a
 * market that moves each day, is stable within the day, and costs nothing to
 * persist.
 */
export function priceMultiplier(carId: string, now = Date.now()): number {
  return 1 + (hash(`${carId}@${marketDay(now)}`) * 2 - 1) * DAILY_SWING
}

/**
 * The dealer's margin on one car, widening as the car gets dearer.
 *
 * Only ever lowers the bid, so the no-arbitrage rule — the keenest ask still
 * beats the best bid — gets safer rather than riskier.
 */
export function bidRateFor(book: number): number {
  const t = Math.min(1, Math.max(0, (book - EXOTIC_FROM) / (EXOTIC_FULL - EXOTIC_FROM)))
  return BID_RATE - t * (BID_RATE - EXOTIC_BID_RATE)
}

/** What a bot pays you for this car right now. */
export function bidPrice(card: CardView, now = Date.now()): number {
  const book = bookValue(card)
  return Math.max(1, Math.round(book * priceMultiplier(card.id, now) * bidRateFor(book)))
}

/**
 * Where a listing's markup sits in the range that can actually occur.
 *
 * Every listing asks more than a dealer will pay — that is the spread, and it
 * is the point. What varies is how much more: ASK_RATE * SKEW spans roughly -3%
 * to +46% over a car's value today, so judging a listing against 0% would call
 * nothing a bargain. These are the quartiles of what the board can produce.
 */
export const KEEN_MARKUP = 1.1
export const STEEP_MARKUP = 1.33

export type Pricing = 'keen' | 'fair' | 'steep'

export function pricingOf(deal: number): Pricing {
  if (deal < KEEN_MARKUP) return 'keen'
  return deal > STEEP_MARKUP ? 'steep' : 'fair'
}

export interface Listing {
  /** Stable for as long as the listing is on the board. */
  id: string
  card: CardView
  price: number
  /** Price relative to what the car is worth today; under 1 is a bargain. */
  deal: number
}

const ORDINARY = ALL_CARDS.filter((c) => !c.special)
const SPECIALS = ALL_CARDS.filter((c) => c.special)

/**
 * Chance any one slot holds a special rather than an ordinary car.
 *
 * Ten slots turning over every twenty minutes puts a special on the board about
 * once every three hours. They used to be excluded entirely, on the grounds
 * that they should be pulled rather than shopped for — but at a 0.4% pack drop
 * that meant roughly €3.000.000 of packs per special, so in practice nobody was
 * ever going to own one. Listing them rarely, at their full and enormous price,
 * makes them the thing you save for instead of a lottery you cannot win.
 */
const SPECIAL_LISTING_CHANCE = 0.01

/**
 * The cars on the board right now.
 *
 * Generated from the restock window so the board is the same every time it is
 * drawn, changes on its own schedule, and needs nothing saved.
 */
export function listings(now = Date.now()): Listing[] {
  const window = restockWindow(now)
  const out: Listing[] = []

  for (let slot = 0; slot < LISTING_COUNT; slot++) {
    const seed = `${window}:${slot}`
    const pool = hash(`rare:${seed}`) < SPECIAL_LISTING_CHANCE ? SPECIALS : ORDINARY
    const card = pool[Math.floor(hash(`car:${seed}`) * pool.length)]
    // Spread asks either side of the mid so the board holds both bargains and
    // traps, and reading which is which is the actual game. The floor is set so
    // that even the keenest listing still asks more than a bot will pay — buy
    // it and sell it straight back and you lose, every time. Profit has to come
    // from holding a cheap car until its price has a good day.
    const skew = SKEW_MIN + hash(`deal:${seed}`) * (SKEW_MAX - SKEW_MIN)
    const today = priceMultiplier(card.id, now)
    // On the cheapest cars — a scooter is worth about four euros — a percentage
    // spread rounds away to nothing and bid meets ask. Keeping the ask at least
    // one euro above the bid holds the no-free-money rule at every price.
    const price = Math.max(
      bidPrice(card, now) + 1,
      Math.round(bookValue(card) * today * ASK_RATE * skew),
    )
    out.push({
      id: seed,
      card,
      price,
      deal: price / Math.max(1, Math.round(bookValue(card) * today)),
    })
  }
  return out
}
