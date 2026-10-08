import { describe, expect, it } from 'vitest'
import { careerStats, type CareerInput } from './career'

const EMPTY: CareerInput = {
  racesRun: 0,
  racesWon: 0,
  seasonTitles: {},
  claimedObjectives: [],
}

describe('careerStats', () => {
  it('is all zeros for a new save, and the win rate does not divide by zero', () => {
    expect(careerStats(EMPTY)).toEqual({
      racesRun: 0,
      racesWon: 0,
      winRate: 0,
      seasonTitles: 0,
      objectivesClaimed: 0,
    })
  })

  it('passes races through', () => {
    const stats = careerStats({ ...EMPTY, racesRun: 8, racesWon: 3 })
    expect(stats.racesRun).toBe(8)
    expect(stats.racesWon).toBe(3)
  })

  it('sums season titles across seasons', () => {
    expect(careerStats({ ...EMPTY, seasonTitles: { 'season-a': 2, 'season-b': 1 } }).seasonTitles).toBe(3)
  })

  it('counts claimed objectives', () => {
    expect(careerStats({ ...EMPTY, claimedObjectives: ['collect-10', 'packs-10'] }).objectivesClaimed).toBe(2)
  })

  it('gives a whole-number win rate, rounded to the nearest percent', () => {
    const rate = (racesWon: number, racesRun: number) => careerStats({ ...EMPTY, racesWon, racesRun }).winRate
    expect(rate(0, 5)).toBe(0)
    expect(rate(5, 5)).toBe(100)
    expect(rate(1, 3)).toBe(33)
    expect(rate(2, 3)).toBe(67)
    expect(rate(57, 200)).toBe(29)
  })
})
