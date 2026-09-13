import type { CardClass, Car, CardView, Stats, Tier } from '../types'

/**
 * Calculate overall rating from real car specs. Normalizes actual values (hp, seconds, km/h, kg)
 * to a comparable scale where top speed and acceleration drive the rating.
 */
export function overall(stats: Stats): number {
  // Normalize real specs to 1-99 scale for calculation
  // HP: typical range 50-1000, exotic up to 1500
  const hpScore = Math.min(99, Math.max(1, Math.round((stats.hp / 10) * 0.8)))

  // Acceleration: typical range 3-15 seconds, inverted (faster = higher score)
  // 2.5s = 99, 15s = 1
  const accScore = Math.min(99, Math.max(1, Math.round(99 - (stats.acc - 2.5) * 7)))

  // Top speed: typical range 130-350 km/h
  // 130 km/h = 20, 350 km/h = 99
  const speedScore = Math.min(99, Math.max(1, Math.round(((stats.topspeed - 130) / 220) * 79 + 20)))

  // Weight: typical range 800-2500 kg, inverted (lighter = higher score)
  // 800 kg = 99, 2500 kg = 1
  const weightScore = Math.min(99, Math.max(1, Math.round(99 - (stats.weight - 800) / 17)))

  // Handling (1-99 subjective) - use directly
  const handlingScore = stats.handling

  // Wow factor (1-99 subjective) - use directly
  const wowScore = stats.wowFactor

  // Weight the normalized scores
  const weighted =
    speedScore * 0.25 +
    accScore * 0.25 +
    hpScore * 0.2 +
    handlingScore * 0.15 +
    weightScore * 0.1 +
    wowScore * 0.05

  return Math.round(weighted)
}

/**
 * Tier cutoffs. Bronze < 41, Silver 41-54, Gold 55+.
 * Calibrated to actual car distribution: 39% bronze, 34% silver, 27% gold, 9% special.
 * A base economy car lands in bronze; a mid-performance car in silver; a sports car in gold.
 */
export function tierOf(rating: number): Tier {
  if (rating < BRONZE_CEILING) return 'bronze'
  if (rating < GOLD_FLOOR) return 'silver'
  return 'gold'
}

export const BRONZE_CEILING = 41
export const GOLD_FLOOR = 55

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
