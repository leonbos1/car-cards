import type { CardView } from '../types'

/**
 * The stake you start with. Enough to reach any pack below Premium Gold on the
 * first tap — at €3.000 the store opened with half its shelves greyed out —
 * without being enough to skip the game.
 */
export const STARTING_BALANCE = 5_000

/**
 * The free pack is a faucet, so it stays on a clock — but a whole day between
 * turns left a new player with about five minutes of game.
 */
export const FREE_PACK_COOLDOWN_MS = 8 * 60 * 60 * 1000

/**
 * How many rating points it takes to double a car's value, by band.
 *
 * A single rate across the whole scale made a 99 worth only about twenty times
 * a 60, which is nothing like how cars actually price: the step from a hot
 * hatch to a supercar dwarfs the step between two hatchbacks. So the curve
 * accelerates — gentle through everyday cars, steeper through performance cars,
 * and near-vertical above 92.
 *
 * 92 is where it turns, because 92 is the highest rating any pack can deal. The
 * 43 cars above it exist only on the market, and pricing them like the cars
 * below made the rarest things in the game cost three days' income. Putting the
 * break exactly on the pack ceiling is also what keeps this safe: no pack's
 * expected value can move, because no pack can reach the band that changed.
 */
const DOUBLING: { upTo: number; points: number }[] = [
  { upTo: 75, points: 9 }, // everyday cars
  { upTo: 88, points: 6.5 }, // performance cars
  { upTo: 92, points: 3.5 }, // flagships — as high as a pack goes
  { upTo: Number.POSITIVE_INFINITY, points: 1.3 }, // market-only supercars
]

const ANCHOR_RATING = 50
const ANCHOR_VALUE = 18

/**
 * What a car is worth on paper.
 *
 * Everything else in the economy is quoted against this: the market trades
 * around it, quick-sell pays a fraction of it, and pack prices key off it.
 */
function baseValue(overall: number): number {
  // Below the anchor the gentlest rate just keeps going; nothing down there
  // needs its own band.
  if (overall <= ANCHOR_RATING) {
    return ANCHOR_VALUE * 2 ** ((overall - ANCHOR_RATING) / DOUBLING[0].points)
  }

  let value = ANCHOR_VALUE
  let from = ANCHOR_RATING
  for (const band of DOUBLING) {
    const to = Math.min(overall, band.upTo)
    if (to <= from) break
    value *= 2 ** ((to - from) / band.points)
    from = to
  }
  return value
}

/** A rare is worth more than a common of the same rating, never less. */
const RARE_MULTIPLIER = 2.2
/** Specials are the jackpot, and are priced to feel like one. */
const SPECIAL_MULTIPLIER = 7

/** The car's book value, before any buyer's or seller's margin. */
export function bookValue(card: CardView): number {
  const multiplier = card.special ? SPECIAL_MULTIPLIER : card.rare ? RARE_MULTIPLIER : 1
  return Math.max(1, Math.round(baseValue(card.overall) * multiplier))
}

/**
 * Quick-sell is the button for when you cannot be bothered: instant, no
 * haggling, and a bad price. Taking a car to the market is worth more than
 * twice as much, which is the point — it gives the market a reason to exist.
 */
export const QUICK_SELL_RATE = 0.4

export function quickSellValue(card: CardView): number {
  return Math.max(1, Math.round(bookValue(card) * QUICK_SELL_RATE))
}

export function formatEuros(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** '3h 12m' — how long until the free pack comes back. */
export function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60_000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`
}
