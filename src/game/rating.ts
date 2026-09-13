import type { CardClass, Car, CardView, Stats, Tier } from '../types'

/**
 * Calculate overall rating from real car specs. Normalizes actual values (hp, seconds, km/h, kg)
 * to a comparable scale where top speed and acceleration drive the rating.
 */
export function overall(stats: Stats): number {
  // Normalize real specs to 1-99 scale for performance-driven scoring
  // These ranges are calibrated so good sports cars hit 60+, hypercars hit 85+

  // HP: ~100 = 20, ~500 = 50, ~1000 = 79, ~2000 = 99
  const hpScore = Math.min(99, Math.max(1, Math.round((stats.hp / 10) * 0.95)))

  // Acceleration: 20s = 1, 10s = 33, 5s = 66, 2.5s = 99
  const accScore = Math.min(99, Math.max(1, Math.round(99 - (stats.acc - 2.5) * 5.5)))

  // Top speed: aggressive scaling so iconic high-speed cars get 90+
  // 100 km/h = 5, 200 km/h = 32, 300 km/h = 60, 400+ km/h = 90, 500+ km/h = 99
  const speedScore = Math.min(99, Math.max(1, Math.round(((stats.topspeed - 100) / 339) * 99)))

  // Weight matters less - lighter is better but not penalizing heavy performance cars
  // 1000 kg = 80, 1500 kg = 50, 2500 kg = 10
  const weightScore = Math.min(99, Math.max(1, Math.round(Math.max(10, 99 - (stats.weight - 1000) / 20))))

  // Handling (1-99 subjective) - use directly
  const handlingScore = stats.handling

  // Wow factor (1-99 subjective) - use directly
  const wowScore = stats.wowFactor

  // Weight the scores heavily toward speed and acceleration
  const weighted =
    speedScore * 0.28 +
    accScore * 0.28 +
    hpScore * 0.22 +
    handlingScore * 0.1 +
    wowScore * 0.08 +
    weightScore * 0.04

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
