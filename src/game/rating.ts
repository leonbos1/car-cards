import type { CardClass, Car, CardView, Stats, Tier } from '../types'

/**
 * Calculate overall rating from real car specs.
 * New tier system: Bronze < 65, Silver 65-74, Gold 75+
 * Formula: base rating + bonus points for performance characteristics.
 * Examples: Giulietta 1.4 (~76), Golf GTI (~81), Golf R (~85), Veyron (~95)
 */
export function overall(stats: Stats): number {
  // Start with base rating for an average car
  const baseRating = 63

  // Top speed bonus: 100 km/h = 0, 200 = 4.5, 300 = 9, 400+ = 14
  const speedBonus = Math.min(14, Math.max(0, (stats.topspeed - 100) / 22))

  // Acceleration bonus: faster is better. 10s = 0, 6s = 4, 2.5s = 7.5
  const accBonus = Math.min(9, Math.max(0, (10 - stats.acc) * 0.95))

  // HP bonus: 100 hp = 0, 300 = 3, 600 = 7, 1000 = 12
  const hpBonus = Math.min(12, Math.max(0, (stats.hp - 100) / 75))

  // Weight bonus: lighter is better, 1000 kg = 2.4, 1500 = 0
  const weightBonus = Math.min(2.4, Math.max(0, (1500 - stats.weight) / 208))

  // Handling bonus: 1-99 scale maps to 0-3 points
  const handlingBonus = (stats.handling - 1) / 98 * 3

  // Wow factor bonus: 1-99 scale maps to 0-3 points
  const wowBonus = (stats.wowFactor - 1) / 98 * 3

  const total = baseRating + speedBonus + accBonus + hpBonus + weightBonus + handlingBonus + wowBonus

  return Math.round(Math.min(99, Math.max(1, total)))
}

/**
 * Tier cutoffs. Bronze < 65, Silver 65-74, Gold 75+.
 * A base economy car lands in bronze; a normal car with performance in silver; a sports car in gold.
 */
export function tierOf(rating: number): Tier {
  if (rating < BRONZE_CEILING) return 'bronze'
  if (rating < GOLD_FLOOR) return 'silver'
  return 'gold'
}

export const BRONZE_CEILING = 65
export const GOLD_FLOOR = 75

export function cardClassOf(car: Car, tier: Tier): CardClass {
  return car.special ? 'special' : tier
}

/** Resolve a car into everything the UI needs to draw it. */
export function toCardView(car: Car): CardView {
  const rating = overall(car.stats)
  // Special cards always rate as gold, regardless of stats
  const tier = car.special ? 'gold' : tierOf(rating)
  return { ...car, overall: rating, tier, cardClass: cardClassOf(car, tier) }
}
