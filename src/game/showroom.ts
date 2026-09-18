import { ALL_CARDS } from './pack'
import type { CardView } from '../types'

/**
 * Daily showroom rotation: 3 featured cars per day get 1.5x race payout.
 * Featured cars change daily, deterministically based on the date.
 */

const SHOWROOM_SIZE = 3
const SHOWROOM_MULTIPLIER = 1.5

/** Hash function for deterministic daily selection. */
function dailyHash(day: number): number {
  // Use day number as seed for deterministic but different values each day
  return Math.abs(Math.sin(day * 12.9898) * 43758.5453)
}

/** Featured cars for today. */
export function featuredCars(now = Date.now()): CardView[] {
  const day = Math.floor(now / 86_400_000)
  const hash = dailyHash(day)
  const seed = Math.floor(hash * ALL_CARDS.length)

  const featured: CardView[] = []
  for (let i = 0; i < SHOWROOM_SIZE; i++) {
    const idx = (seed + i) % ALL_CARDS.length
    featured.push(ALL_CARDS[idx])
  }
  return featured
}

/** Is a car featured today? */
export function isFeatured(cardId: string, now = Date.now()): boolean {
  return featuredCars(now).some((c) => c.id === cardId)
}

/** Apply showroom multiplier if car is featured. */
export function applyShowroomBonus(payout: number, cardId: string, now = Date.now()): number {
  return isFeatured(cardId, now) ? Math.round(payout * SHOWROOM_MULTIPLIER) : payout
}
