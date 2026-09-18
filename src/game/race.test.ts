import { describe, expect, it } from 'vitest'
import { bookValue } from './economy'
import { ALL_CARDS } from './pack'
import {
  EVENTS,
  PRIZE_SCALE,
  classOf,
  eligible,
  entryLine,
  fitness,
  payoutFor,
  race,
  type RaceEvent,
} from './race'
import type { CardView } from '../types'

function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

/** Eligible cars for an event, best-suited first. */
function ranked(event: RaceEvent): CardView[] {
  return [...eligible(event)].sort((a, b) => fitness(b, event) - fitness(a, event))
}

function averagePay(card: CardView, event: RaceEvent, runs = 400): number {
  let total = 0
  for (let seed = 0; seed < runs; seed++) {
    total += race(card, event, seeded(seed * 2654435761)).payout
  }
  return total / runs
}

/**
 * Seconds a race takes to pick and watch, which is the only thing bounding what
 * racing pays. Kept in step with RACE_MS in the Race component plus the couple
 * of seconds it takes to read a result and tap again; shortening the animation
 * without re-checking these numbers is how the grind would quietly double.
 */
const SECONDS_PER_RACE = 7
const RACES_PER_HOUR = 3_600 / SECONDS_PER_RACE

describe('race events', () => {
  it('has no duplicate ids and a class for every event', () => {
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length)
    for (const event of EVENTS) {
      expect(classOf(event), event.name).toBeTruthy()
      expect(entryLine(event), event.name).toBeTruthy()
      expect(event.prize, event.name).toBeGreaterThan(0)
    }
  })

  it('gives every event a field it can fill', () => {
    // A grid bigger than the pool would race the same car against itself.
    for (const event of EVENTS) {
      expect(eligible(event).length, `${event.name} has too few cars`).toBeGreaterThan(event.grid)
    }
  })

  it('always fills the grid and always pays something', () => {
    for (const event of EVENTS) {
      const car = ranked(event)[0]
      for (let seed = 0; seed < 50; seed++) {
        const result = race(car, event, seeded(seed))
        expect(result.order.length, event.name).toBe(event.grid)
        expect(new Set(result.order.map((e) => e.card.id)).size).toBe(event.grid)
        expect(result.order.filter((e) => e.mine).length).toBe(1)
        expect(result.position).toBeGreaterThanOrEqual(1)
        expect(result.position).toBeLessThanOrEqual(event.grid)
        // Last place still pays. A grind that sometimes returns nothing is one
        // nobody does.
        expect(result.payout, event.name).toBeGreaterThan(0)
      }
    }
  })

  it('pays more for a better finish', () => {
    for (const event of EVENTS) {
      for (let p = 2; p <= event.grid; p++) {
        expect(payoutFor(event, p - 1)).toBeGreaterThanOrEqual(payoutFor(event, p))
      }
    }
  })

  it('makes the car you enter matter more than anything else', () => {
    // The whole design rests on this. If a poor entry paid nearly as well as a
    // good one, racing would be a button rather than a decision, and the
    // collection would stop mattering.
    for (const event of EVENTS) {
      const pool = ranked(event)
      const best = averagePay(pool[0], event)
      const worst = averagePay(pool[pool.length - 1], event)
      expect(best / worst, `${event.name} barely rewards the right car`).toBeGreaterThan(4)
    }
  })

  it('rewards the classes in order', () => {
    // An Elite grid must out-pay a Rookie one, or there is no reason to buy
    // better cars and the whole ladder inverts.
    const rate = (cls: string) => {
      const events = EVENTS.filter((e) => classOf(e) === cls)
      return Math.max(...events.map((e) => averagePay(ranked(e)[0], e, 200)))
    }
    const rookie = rate('Rookie')
    const club = rate('Club')
    const national = rate('National')
    const elite = rate('Elite')
    expect(club).toBeGreaterThan(rookie)
    expect(national).toBeGreaterThan(club)
    expect(elite).toBeGreaterThan(national)
  })

  it('keeps the underlying prize tuning sane, whatever the dial is set to', () => {
    // Racing is the one earner with no cooldown, so what a flat-out hour pays
    // is the only thing holding it. PRIZE_SCALE is deliberately not part of
    // that: it is the knob the game is balanced with, and pinning the rate
    // itself would mean this test failing every time someone turned it.
    //
    // So the rate is measured back at a scale of one. That still catches the
    // thing worth catching — a prize, a grid size or the length of a race
    // drifting until the ladder underneath makes no sense — while leaving how
    // fast the grind runs as a decision rather than a regression.
    const bestRate =
      Math.max(...EVENTS.map((e) => averagePay(ranked(e)[0], e, 200) * RACES_PER_HOUR)) /
      PRIZE_SCALE
    const topCar = Math.max(...ALL_CARDS.filter((c) => !c.special).map(bookValue))

    expect(bestRate, `unscaled, racing pays ${Math.round(bestRate)} an hour`).toBeGreaterThan(
      20_000,
    )
    expect(
      topCar / bestRate,
      `unscaled, the best car is ${(topCar / bestRate).toFixed(1)} hours of racing`,
    ).toBeGreaterThan(1.5)
  })

  it('opens the best-paying events only to cars a pack cannot deal', () => {
    // The Elite grids are where the money is, and the cars that qualify are the
    // ones the market keeps to itself. That is what stops a new player skipping
    // straight to the top of the grind.
    for (const event of EVENTS.filter((e) => classOf(e) === 'Elite')) {
      expect(event.minOverall).toBeGreaterThan(87)
    }
  })

  it('scores the same car differently in different disciplines', () => {
    // If fitness tracked the rating, every event would have the same answer.
    const circuit = EVENTS.find((e) => e.id === 'national-circuit')!
    const show = EVENTS.find((e) => e.id === 'national-show')!
    const bestCircuit = ranked(circuit)[0]
    const bestShow = ranked(show)[0]
    expect(bestCircuit.id).not.toBe(bestShow.id)
    expect(fitness(bestShow, circuit)).toBeLessThan(fitness(bestCircuit, circuit))
  })

  it('is deterministic for a given seed', () => {
    const event = EVENTS[0]
    const car = ranked(event)[0]
    const a = race(car, event, seeded(11))
    const b = race(car, event, seeded(11))
    expect(a.order.map((e) => e.card.id)).toEqual(b.order.map((e) => e.card.id))
    expect(a.payout).toBe(b.payout)
  })
})
