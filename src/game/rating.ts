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
 * Same shape as FIFA's rating cuts, tuned against the roster so the split lands
 * near 36 bronze / 34 silver / 30 gold. A 320hp Civic Type R is genuinely quick,
 * but it is not a gold car in a set that contains a Chiron.
 */
export function tierOf(rating: number): Tier {
  if (rating < BRONZE_CEILING) return 'bronze'
  if (rating < GOLD_FLOOR) return 'silver'
  return 'gold'
}

export const BRONZE_CEILING = 70
export const GOLD_FLOOR = 84

export function cardClassOf(car: Car, tier: Tier): CardClass {
  return car.special ? 'special' : tier
}

/** Resolve a car into everything the UI needs to draw it. */
export function toCardView(car: Car): CardView {
  const rating = overall(car.stats)
  const tier = tierOf(rating)
  return { ...car, overall: rating, tier, cardClass: cardClassOf(car, tier) }
}
