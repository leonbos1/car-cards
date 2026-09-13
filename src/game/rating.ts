import type { CardClass, Car, CardView, Stats, Tier } from '../types'

/**
 * Turns real specs into a 1-99 card rating.
 *
 * Two steps: reduce the specs to a single performance index, then map that
 * index onto the rating scale through a curve pinned to cars whose rating was
 * agreed by hand. Keeping the two apart means the scale can be retuned by
 * moving a control point, without touching how performance is measured.
 */

/**
 * How quick a car feels, as one log-scale number.
 *
 * Power-to-weight leads because it is what you notice from the driver's seat;
 * 0-100 and top speed fill in the rest. Weight needs no term of its own — it is
 * already the denominator of power-to-weight.
 *
 * Log scale because performance is judged in ratios, not differences: 100 to
 * 200 hp transforms a car, 900 to 1000 hp barely registers. A linear formula
 * has to choose between resolving the bottom of the range and the top, and the
 * previous one chose the top, which left two thirds of the roster inside three
 * rating points.
 */
function performanceIndex(stats: Stats): number {
  // Floors keep a malformed row from producing -Infinity.
  const powerToWeight = Math.max(0.004, stats.hp / Math.max(350, stats.weight))
  const acc = Math.max(1.5, stats.acc)
  const topspeed = Math.max(40, stats.topspeed)

  return (
    0.45 * Math.log(powerToWeight) + 0.3 * Math.log(1 / acc) + 0.25 * Math.log(topspeed)
  )
}

/**
 * Performance index -> rating, as control points the curve passes through.
 *
 * Each is a real car placed by hand; between them the mapping is linear. The
 * curve steepens at the bottom so slow cars spread out instead of bunching, and
 * flattens at the top so hypercars separate on genuine difference rather than
 * all piling into the ceiling — under the old formula a 1001 hp Veyron and a
 * 1600 hp Chiron both came out at 98.
 *
 * Control points sit slightly off their car's final rating on purpose: the
 * roster gives quick cars high handling and desirability and slow cars low, so
 * the adjustment below carries a systematic -1.4 at the bottom and +2 at the
 * top. The curve absorbs that, leaving the adjustment to do what it is for —
 * separating cars whose numbers are the same.
 */
const CURVE: readonly (readonly [index: number, rating: number])[] = [
  [-1.45, 31.5], // 1965 Fiat 500 — 18 hp, 40 s to 100 km/h
  [-0.82, 61.5], // 63 hp Polo — the bronze example this scale was asked for
  [-0.51, 68.4], // 95 hp Polo
  [-0.19, 76], // Alfa Romeo Giulietta 1.4 MultiAir — the floor of gold
  [0.03, 80.1], // Golf GTI
  [0.21, 84.3], // Golf R
  [0.62, 90.3], // Porsche 911 GT3 RS
  [0.94, 93.5], // Bugatti Veyron
  [1.19, 96], // Bugatti Chiron Super Sport 300+
]

/** Linear between control points, and along the end slopes beyond them. */
function alongCurve(index: number): number {
  const segment = (i: number) => {
    const [x0, y0] = CURVE[i]
    const [x1, y1] = CURVE[i + 1]
    return y0 + ((index - x0) / (x1 - x0)) * (y1 - y0)
  }

  if (index <= CURVE[0][0]) return segment(0)
  for (let i = 0; i < CURVE.length - 1; i++) {
    if (index <= CURVE[i + 1][0]) return segment(i)
  }
  return segment(CURVE.length - 2)
}

/**
 * Handling and desirability are authored by hand rather than measured, so they
 * adjust the rating rather than drive it: enough to separate two cars with the
 * same numbers, not enough to make a slow car quick.
 */
function characterAdjustment(stats: Stats): number {
  const handling = (stats.handling - 50) / 49 // -1 … 1
  const wow = (stats.wowFactor - 50) / 49
  return handling * 1.5 + wow * 1.5
}

export function overall(stats: Stats): number {
  const rating = alongCurve(performanceIndex(stats)) + characterAdjustment(stats)
  return Math.round(Math.min(99, Math.max(1, rating)))
}

/** Bronze below 65, silver 65-74, gold 75 and up. */
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
