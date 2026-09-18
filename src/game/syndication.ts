import { ALL_CARDS } from './pack'
import type { CardView } from '../types'

/**
 * Car syndication: own 3+ copies of a car and rent them out daily for
 * passive income. A percentage of the car's book value per day.
 */

const CARD_BY_ID = new Map(ALL_CARDS.map((c) => [c.id, c]))

/** Syndicatable cars: those owned in copies >= 3. */
export function syndicatableCars(collection: Record<string, number>): CardView[] {
  return Object.entries(collection)
    .filter(([, owned]) => owned >= 3)
    .map(([id]) => CARD_BY_ID.get(id))
    .filter((c): c is CardView => Boolean(c))
}

/**
 * Daily rental income for one car. Capped at book value — you do not make
 * more from renting than the car costs on the market.
 *
 * Formula: book value * 0.5% per day (scales to 15%/month, reasonable for a car).
 */
export function dailyRentalIncome(card: CardView): number {
  // Estimate book value from overall rating; see economy.ts
  const bookValue = Math.round(Math.pow(card.overall, 2.2) * 50)
  return Math.max(1, Math.round(bookValue * 0.005))
}

/** When the last syndication payout occurred, as epoch ms. */
export type SyndicationState = Record<string, number>

/** Syndicatable cars that have earned payout since last claim. */
export function syndicationReadyToClaim(
  collection: Record<string, number>,
  syndicationLastClaimed: SyndicationState,
  now = Date.now(),
): CardView[] {
  const DAY_MS = 86_400_000
  return syndicatableCars(collection).filter((car) => {
    const last = syndicationLastClaimed[car.id] ?? 0
    return now - last >= DAY_MS
  })
}

/**
 * Claim all ready syndication payouts. Returns total earned.
 */
export function claimSyndication(
  collection: Record<string, number>,
  syndicationLastClaimed: SyndicationState,
  now = Date.now(),
): { earned: number; updated: SyndicationState } {
  const ready = syndicationReadyToClaim(collection, syndicationLastClaimed, now)
  let earned = 0
  const updated = { ...syndicationLastClaimed }
  for (const car of ready) {
    earned += dailyRentalIncome(car)
    updated[car.id] = now
  }
  return { earned, updated }
}
