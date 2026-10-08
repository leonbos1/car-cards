import { describe, expect, it } from 'vitest'
import { ALL_CARDS } from './pack'
import { featuredCars, isFeatured, nextShowroomIn, SHOWROOM_MULTIPLIER, SHOWROOM_SIZE, withShowroomBonus } from './showroom'
import { EVENTS, race } from './race'

const DAY = 86_400_000
const NOON = 12 * 60 * 60 * 1000

/** A deterministic random source that varies, so race() can always find a new pick. */
function seeded(seed: number): () => number {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

describe('showroom', () => {
  it('features three different cars, the same for everyone on a given day', () => {
    const day = 20_000 * DAY + NOON
    const cars = featuredCars(day)
    expect(cars).toHaveLength(SHOWROOM_SIZE)
    expect(new Set(cars.map((c) => c.id)).size).toBe(SHOWROOM_SIZE)
    expect(featuredCars(day + 3 * 60 * 60 * 1000).map((c) => c.id)).toEqual(cars.map((c) => c.id))
  })

  it('rotates across days rather than showing the same three forever', () => {
    const ids = new Set<string>()
    for (let d = 0; d < 30; d++) for (const c of featuredCars(d * DAY + NOON)) ids.add(c.id)
    expect(ids.size).toBeGreaterThan(SHOWROOM_SIZE * 10)
  })

  it('pays the multiplier on a featured car and says so', () => {
    const now = 20_000 * DAY + NOON
    const car = featuredCars(now)[0]
    const event = EVENTS[0]
    const base = race(car, event, seeded(7))
    const boosted = withShowroomBonus(base, car, now)
    expect(boosted.payout).toBe(Math.round(base.payout * SHOWROOM_MULTIPLIER))
    expect(boosted.showroom).toBe(true)
    expect(boosted.order).toEqual(base.order)
    expect(boosted.position).toBe(base.position)
  })

  it('leaves the result of an unfeatured car exactly as it was', () => {
    const now = 20_000 * DAY + NOON
    const featured = featuredCars(now).map((c) => c.id)
    const car = ALL_CARDS.find((c) => !featured.includes(c.id))!
    const base = race(car, EVENTS[0], seeded(7))
    expect(withShowroomBonus(base, car, now)).toBe(base)
    expect(isFeatured(car, now)).toBe(false)
  })

  it('counts down to the next midnight UTC', () => {
    expect(nextShowroomIn(0)).toBe(DAY)
    expect(nextShowroomIn(DAY - 1)).toBe(1)
    expect(nextShowroomIn(NOON)).toBe(DAY - NOON)
  })
})
