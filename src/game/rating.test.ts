import { describe, expect, it } from 'vitest'
import { CARS } from '../data/cars'
import type { Stats } from '../types'
import { BRONZE_CEILING, GOLD_FLOOR, overall, tierOf } from './rating'

const specs = (hp: number, acc: number, topspeed: number, weight: number): Stats => ({
  hp, acc, topspeed, weight, handling: 50, wowFactor: 50,
})

/**
 * The year to rate a bare set of specs at. Pace is discounted by age, so a
 * test about the formula itself has to hold the year still — otherwise it is
 * measuring the era discount by accident.
 */
const NOW = 2023
const rate = (stats: Stats, year = NOW) => overall(stats, year)

/**
 * The cars the scale was tuned against, with the rating each was agreed to
 * land on. These are the whole point of the curve — if one drifts, the scale
 * has moved under everything else too.
 */
const ANCHORS: [name: string, target: number][] = [
  ['Volkswagen Polo', 67],
  ['Volkswagen Golf GTI', 80],
  ['Volkswagen Golf R', 84],
  ['Porsche 911 GT3 RS', 91],
  ['Bugatti Veyron', 95],
  ['Bugatti Chiron Super Sport 300+', 98],
]

describe('rating scale', () => {
  it('puts the anchor cars where they were agreed to sit', () => {
    for (const [name, target] of ANCHORS) {
      const car = CARS.find((c) => `${c.make} ${c.model}` === name)
      expect(car, `${name} is missing from the roster`).toBeDefined()
      expect(overall(car!.stats, car!.year), name).toBe(target)
    }
  })

  it('rises with every spec that makes a car quicker', () => {
    const base = specs(200, 7, 220, 1400)
    expect(rate({ ...base, hp: 300 })).toBeGreaterThan(rate(base))
    expect(rate({ ...base, acc: 5 })).toBeGreaterThan(rate(base))
    expect(rate({ ...base, topspeed: 280 })).toBeGreaterThan(rate(base))
    expect(rate({ ...base, weight: 1100 })).toBeGreaterThan(rate(base))
    expect(rate({ ...base, handling: 90 })).toBeGreaterThan(rate(base))
    expect(rate({ ...base, wowFactor: 90 })).toBeGreaterThan(rate(base))
  })

  it('keeps every rating on the 1-99 scale', () => {
    for (const car of CARS) {
      const rating = overall(car.stats, car.year)
      expect(rating, `${car.make} ${car.model}`).toBeGreaterThanOrEqual(1)
      expect(rating, `${car.make} ${car.model}`).toBeLessThanOrEqual(99)
    }
    // A scooter and a hypercar must not saturate to the same end of the scale.
    expect(rate(specs(7, 19, 85, 130))).toBeLessThan(30)
    expect(rate(specs(1600, 2.4, 490, 1995))).toBeGreaterThan(95)
  })

  it('spreads the roster over most of the scale', () => {
    // The previous formula started every car at 60 and used 37 of 99 points,
    // stacking 179 cars on a single rating.
    const ratings = CARS.filter((c) => !c.special).map((c) => overall(c.stats, c.year))
    expect(Math.max(...ratings) - Math.min(...ratings)).toBeGreaterThan(70)

    const counts = new Map<number, number>()
    for (const r of ratings) counts.set(r, (counts.get(r) ?? 0) + 1)
    const busiest = Math.max(...counts.values())
    expect(busiest / ratings.length).toBeLessThan(0.08)
  })

  it('gives every tier enough cars for the packs to draw from', () => {
    const counts = { bronze: 0, silver: 0, gold: 0 }
    for (const car of CARS.filter((c) => !c.special)) counts[tierOf(overall(car.stats, car.year))]++
    // The free pack deals three bronze and four silver in a single opening.
    expect(counts.bronze).toBeGreaterThan(20)
    expect(counts.silver).toBeGreaterThan(20)
    expect(counts.gold).toBeGreaterThan(20)
  })

  it('agrees with the tier boundaries it publishes', () => {
    expect(tierOf(BRONZE_CEILING - 1)).toBe('bronze')
    expect(tierOf(BRONZE_CEILING)).toBe('silver')
    expect(tierOf(GOLD_FLOOR - 1)).toBe('silver')
    expect(tierOf(GOLD_FLOOR)).toBe('gold')
  })
})
