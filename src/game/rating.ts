import type { CardClass, Car, CardView, Stats, Tier } from '../types'

/**
 * Weighted mean of the six stats. Speed, acceleration, power and handling carry
 * the weight; braking and style are the tiebreakers.
 */
export function overall(stats: Stats): number {
  const weighted =
    stats.spd * 0.2 +
    stats.acc * 0.2 +
    stats.pwr * 0.2 +
    stats.han * 0.2 +
    stats.brk * 0.1 +
    stats.sty * 0.1
  return Math.round(weighted)
}

/**
 * Tier cutoffs. Bronze < 70, Silver 70-78, Gold 79+.
 * This balances the tiers (~150 bronze, 50 silver, 100 gold) so packs
 * never exhaust a tier. A 320hp Civic Type R lands in silver; a 720S in gold.
 */
export function tierOf(rating: number): Tier {
  if (rating < BRONZE_CEILING) return 'bronze'
  if (rating < GOLD_FLOOR) return 'silver'
  return 'gold'
}

export const BRONZE_CEILING = 70
export const GOLD_FLOOR = 79

export function cardClassOf(car: Car, tier: Tier): CardClass {
  return car.special ? 'special' : tier
}

/** Resolve a car into everything the UI needs to draw it. */
export function toCardView(car: Car): CardView {
  const rating = overall(car.stats)
  const tier = tierOf(rating)
  return { ...car, overall: rating, tier, cardClass: cardClassOf(car, tier) }
}
