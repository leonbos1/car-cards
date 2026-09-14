import type { CardView } from '../types'

/**
 * The stake you start with. Enough for a few cheap packs, not enough to skip
 * the game: everything after this has to be earned.
 */
export const STARTING_BALANCE = 3_000

/** The free pack is the faucet, so it is the one thing on a clock. */
export const FREE_PACK_COOLDOWN_MS = 24 * 60 * 60 * 1000

/**
 * What a car is worth on paper.
 *
 * Doubles roughly every nine rating points, so a 95 is worth about thirty times
 * a 50 rather than the flat 600 every gold used to bring. Everything else in
 * the economy is quoted against this: the market trades around it, quick-sell
 * pays a fraction of it, and pack prices key off it.
 */
function baseValue(overall: number): number {
  return 18 * 2 ** ((overall - 50) / 9)
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
