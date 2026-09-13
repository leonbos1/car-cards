import type { CardView } from '../types'

/**
 * The stake you start with. Enough for a few cheap packs, not enough to skip
 * the game: everything after this has to be earned.
 */
export const STARTING_BALANCE = 3_000

/** The free pack is the faucet, so it is the one thing on a clock. */
export const FREE_PACK_COOLDOWN_MS = 24 * 60 * 60 * 1000

/**
 * What a duplicate fetches.
 *
 * Doubles roughly every nine rating points, so a 95 is worth about thirty times
 * a 50 rather than the flat 600 every gold used to bring. Pack prices key off
 * this curve, which is the only reason they can scale with what is inside.
 */
function baseValue(overall: number): number {
  return 18 * 2 ** ((overall - 50) / 9)
}

/** A rare is worth more than a common of the same rating, never less. */
const RARE_MULTIPLIER = 2.2
/** Specials are the jackpot, and are priced to feel like one. */
const SPECIAL_MULTIPLIER = 7

export function quickSellValue(card: CardView): number {
  const multiplier = card.special ? SPECIAL_MULTIPLIER : card.rare ? RARE_MULTIPLIER : 1
  return Math.max(1, Math.round(baseValue(card.overall) * multiplier))
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
