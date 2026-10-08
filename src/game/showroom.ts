import { ALL_CARDS } from './pack'
import type { CardView } from '../types'
import type { RaceResult } from './race'

/**
 * The showroom: three cars a day that pay 1.5x when entered in a race event.
 *
 * Chosen from the UTC date, so every player is shown the same three and they
 * change at midnight UTC. Championship rounds are not boosted, because a season
 * already pays its title in full and the boost should not stack on that.
 */

export const SHOWROOM_SIZE = 3
export const SHOWROOM_MULTIPLIER = 1.5

const DAY_MS = 86_400_000

/** Hash function for deterministic daily selection. */
function dailyHash(day: number): number {
  // Use day number as seed for deterministic but different values each day
  return Math.abs(Math.sin(day * 12.9898) * 43758.5453)
}

/** Featured cars for today. */
export function featuredCars(now = Date.now()): CardView[] {
  const day = Math.floor(now / DAY_MS)
  const hash = dailyHash(day)
  const seed = Math.floor(hash * ALL_CARDS.length)

  const featured: CardView[] = []
  for (let i = 0; i < SHOWROOM_SIZE; i++) {
    const idx = (seed + i) % ALL_CARDS.length
    featured.push(ALL_CARDS[idx])
  }
  return featured
}

export function isFeatured(card: CardView, now = Date.now()): boolean {
  return featuredCars(now).some((c) => c.id === card.id)
}

/** Milliseconds until the showroom rotates at midnight UTC. */
export function nextShowroomIn(now = Date.now()): number {
  return DAY_MS - (now % DAY_MS)
}

/**
 * A race result with the showroom bonus applied if the entered car is featured
 * today. Only the payout changes, so the finishing order is what really
 * happened on the day.
 */
export function withShowroomBonus(result: RaceResult, entry: CardView, now = Date.now()): RaceResult {
  if (!isFeatured(entry, now)) return result
  return {
    ...result,
    payout: Math.round(result.payout * SHOWROOM_MULTIPLIER),
    showroom: true,
  }
}
