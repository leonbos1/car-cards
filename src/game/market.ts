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

/** Deterministic hash, so a price depends only on the car and the day. */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
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

/** What a bot pays you for this car right now. */
export function bidPrice(card: CardView, now = Date.now()): number {
  return Math.max(1, Math.round(bookValue(card) * priceMultiplier(card.id, now) * BID_RATE))
}

export interface Listing {
  /** Stable for as long as the listing is on the board. */
  id: string
  card: CardView
  price: number
  /** Price relative to what the car is worth today; under 1 is a bargain. */
  deal: number
}

const TRADEABLE = ALL_CARDS

/**
 * The cars on the board right now.
 *
 * Generated from the restock window so the board is the same every time it is
 * drawn, changes on its own schedule, and needs nothing saved. Specials are
 * excluded: the market would otherwise be a way to buy the rarest cards
 * outright, and they are supposed to be pulled, not shopped for.
 */
export function listings(now = Date.now()): Listing[] {
  const window = restockWindow(now)
  const pool = TRADEABLE.filter((c) => !c.special)
  const out: Listing[] = []

  for (let slot = 0; slot < LISTING_COUNT; slot++) {
    const seed = `${window}:${slot}`
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
