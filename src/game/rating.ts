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

/**
 * How much of a car's quoted performance survives the years.
 *
 * The index above measures a car against physics, which makes the rating
 * era-blind: a 1967 pickup quoting 250 hp scored like a modern 250 hp car, and
 * the roster came out with the 1970s rated *higher* than the 2020s. A 1987
 * Civic, a 1967 C10 and a Mk1 Golf GTI were all gold cards.
 *
 * Three real things sit behind that, and they all point the same way. American
 * figures before 1972 are gross — measured off an engine with no alternator,
 * water pump or exhaust — and run about a fifth above the net numbers every
 * modern car quotes. Period 0-100 times came from magazines with a clear
 * interest in a good headline. And nothing in the index sees tyres, brakes or
 * aerodynamics, which is where most of fifty years of progress actually went.
 *
 * So pace is discounted by age, at roughly a tenth of an index unit per decade,
 * and zero from 2010 on — which leaves every control point below pinned exactly
 * where it was measured.
 *
 * The discount is applied to the index rather than the rating so that the shape
 * of the curve carries it: the curve is flattest at the top, so an icon loses
 * two or three points where an ordinary saloon loses seven, and a GT40 stays an
 * 87 while a 1967 C10 pickup falls out of gold. The curve is also brutally
 * steep at the bottom, though, which is the other end of the same fact — left
 * alone it took a Ford Model T from 33 to below zero. So the drop is capped at
 * what it would cost in the middle of the scale: age costs a car the same
 * points wherever it sits, except at the top, where it costs less.
 */
const ERA_FREE_FROM = 2010
const ERA_RATE_PER_DECADE = 0.09

/** Rating points per index unit around the gold threshold, where the curve is
 * neither flattened for hypercars nor steepened for the very slow. */
const MID_SLOPE = 18.6

function eraPenalty(year: number): number {
  return (ERA_RATE_PER_DECADE * Math.max(0, ERA_FREE_FROM - year)) / 10
}

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

export function overall(stats: Stats, year: number): number {
  const index = performanceIndex(stats)
  const penalty = eraPenalty(year)
  const pace = Math.max(
    alongCurve(index - penalty),
    alongCurve(index) - penalty * MID_SLOPE,
  )
  return Math.round(Math.min(99, Math.max(1, pace + characterAdjustment(stats))))
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
  const rating = overall(car.stats, car.year)
  // Special cards always rate as gold, regardless of stats
  const tier = car.special ? 'gold' : tierOf(rating)
  return { ...car, overall: rating, tier, cardClass: cardClassOf(car, tier) }
}
