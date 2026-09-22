import { describe, expect, it } from 'vitest'
import type { CardView } from '../types'
import {
  POINTS,
  SEASONS,
  YOU,
  fieldableRounds,
  gridOf,
  pointsFor,
  rivalsFor,
  roundEvent,
  runRound,
  seasonBonus,
  standings,
  type Season,
} from './championships'
import { EVENT_BY_ID, eligible, fitness } from './race'

function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

/** Each round's eligible cars, best-suited first. */
function pools(season: Season): CardView[][] {
  return season.rounds.map((_, i) => {
    const event = roundEvent(season, i)
    return [...eligible(event)].sort((a, b) => fitness(b, event) - fitness(a, event))
  })
}

/** Share of seasons won by a player entering the car at this percentile of each round's field. */
function titleRate(season: Season, percentile: number, runs = 150): number {
  const ranked = pools(season)
  let titles = 0
  for (let run = 0; run < runs; run++) {
    const rng = seeded(run * 7919 + 1)
    const rounds = ranked.map((pool, i) =>
      runRound(season, i, pool[Math.round((1 - percentile) * (pool.length - 1))], rng),
    )
    if (standings(season, rounds)[0].driver === YOU) titles++
  }
  return titles / runs
}

describe('championship seasons', () => {
  it('names real events, and every round of a season shares one grid', () => {
    for (const season of SEASONS) {
      expect(new Set(season.rounds).size, season.name).toBe(season.rounds.length)
      for (const id of season.rounds) {
        const event = EVENT_BY_ID.get(id)
        expect(event, `${season.name}: ${id}`).toBeTruthy()
        // One fixed set of rivals races every round, so the grid cannot change.
        expect(event!.grid, `${season.name}: ${id}`).toBe(gridOf(season))
      }
      expect(rivalsFor(season)).toHaveLength(gridOf(season) - 1)
    }
  })

  it('gives every round enough cars for the whole rival field to pick apart', () => {
    for (const season of SEASONS) {
      season.rounds.forEach((id, i) => {
        expect(eligible(roundEvent(season, i)).length, `${season.name}: ${id}`).toBeGreaterThan(
          gridOf(season) * 2,
        )
      })
    }
  })

  it('fills the grid with distinct cars and never hands a rival yours', () => {
    for (const season of SEASONS) {
      const ranked = pools(season)
      for (let seed = 0; seed < 30; seed++) {
        const rng = seeded(seed)
        ranked.forEach((pool, i) => {
          const mine = pool[0]
          const result = runRound(season, i, mine, rng)
          expect(result.order).toHaveLength(gridOf(season))
          expect(new Set(result.order.map((e) => e.carId)).size).toBe(gridOf(season))
          expect(result.order.filter((e) => e.carId === mine.id)).toEqual([
            { driver: YOU, carId: mine.id },
          ])
        })
      }
    }
  })

  it('races the round without you when you sit it out, and scores you nothing', () => {
    const season = SEASONS[1]
    const result = runRound(season, 0, null, seeded(3))
    expect(result.position).toBeNull()
    expect(result.payout).toBe(0)
    expect(result.order).toHaveLength(gridOf(season) - 1)
    expect(result.order.some((e) => e.driver === YOU)).toBe(false)
    expect(standings(season, [result]).find((s) => s.driver === YOU)!.points).toBe(0)
  })

  it('scores the table from the finishing order', () => {
    const season = SEASONS[2]
    const ranked = pools(season)
    const rng = seeded(11)
    const rounds = ranked.map((pool, i) => runRound(season, i, pool[5], rng))
    const table = standings(season, rounds)
    const awarded = rounds.reduce(
      (sum, r) => sum + r.order.reduce((s, _, i) => s + pointsFor(i + 1), 0),
      0,
    )
    expect(table.reduce((sum, row) => sum + row.points, 0)).toBe(awarded)
    expect(table.reduce((sum, row) => sum + row.wins, 0)).toBe(rounds.length)
    for (let i = 1; i < table.length; i++) {
      expect(table[i - 1].points).toBeGreaterThanOrEqual(table[i].points)
    }
    expect(pointsFor(1)).toBe(POINTS[0])
    expect(pointsFor(POINTS.length + 1)).toBe(0)
  })

  it('is deterministic for a given seed', () => {
    const season = SEASONS[3]
    const car = pools(season)[0][10]
    expect(runRound(season, 0, car, seeded(42))).toEqual(runRound(season, 0, car, seeded(42)))
  })

  it('makes the title winnable for a deep garage and out of reach for an average one', () => {
    // The tuning the rival field is built around. The best rival picks from
    // near the top of each round's field but not the very top, because with
    // luck as small as it is, a rival on the single best car would make the
    // title unwinnable for anyone who did not own it for every discipline.
    for (const season of SEASONS) {
      expect(titleRate(season, 0.97), `${season.name}, top-3% cars`).toBeGreaterThan(0.85)
      expect(titleRate(season, 0.6), `${season.name}, median-ish cars`).toBeLessThan(0.02)
    }
  })

  it('counts each car once when working out how many rounds you can field', () => {
    // A car eligible for every round of the Rookie Cup can still only start one.
    const season = SEASONS[0]
    const everywhere = season.rounds.map((_, i) => new Set(eligible(roundEvent(season, i)).map((c) => c.id)))
    const allRounder = eligible(roundEvent(season, 0)).find((c) => everywhere.every((set) => set.has(c.id)))
    expect(allRounder, 'no car fits every Rookie Cup round — pick another test car').toBeTruthy()
    expect(fieldableRounds(season, [allRounder!])).toBe(1)

    const one = pools(season).map((pool) => pool[0])
    expect(fieldableRounds(season, one)).toBe(new Set(one.map((c) => c.id)).size)
    // Already-used cars and already-run rounds are left out.
    expect(fieldableRounds(season, one, [one[0].id], 1)).toBeLessThanOrEqual(season.rounds.length - 1)
  })

  it('pays title money only to the podium, more for a better finish', () => {
    for (const season of SEASONS) {
      expect(seasonBonus(season, 1)).toBeGreaterThan(seasonBonus(season, 2))
      expect(seasonBonus(season, 2)).toBeGreaterThan(seasonBonus(season, 3))
      expect(seasonBonus(season, 3)).toBeGreaterThan(0)
      expect(seasonBonus(season, 4)).toBe(0)
    }
    // Higher classes pay more for the title, or there is no reason to climb.
    for (let i = 1; i < SEASONS.length; i++) {
      expect(seasonBonus(SEASONS[i], 1)).toBeGreaterThan(seasonBonus(SEASONS[i - 1], 1))
    }
  })
})
