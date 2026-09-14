import { describe, expect, it } from 'vitest'
import { bookValue } from './economy'
import {
  CONTRACT_COUNT,
  CONTRACT_REFRESH_MS,
  MAX_DAILY_CONTRACT_REWARD,
  contractWindow,
  contracts,
  matchesWant,
  qualifying,
} from './contracts'
import { bidPrice } from './market'
import { ALL_CARDS } from './pack'

const WINDOWS = 2000
const every = function* () {
  for (let w = 0; w < WINDOWS; w++) yield* contracts(w * CONTRACT_REFRESH_MS)
}

describe('buyer contracts', () => {
  it('always posts a full board', () => {
    for (let w = 0; w < WINDOWS; w++) {
      expect(contracts(w * CONTRACT_REFRESH_MS).length, `window ${w}`).toBe(CONTRACT_COUNT)
    }
  })

  it('never asks for something nobody could own', () => {
    // A request that no car satisfies is a dead row and a broken promise. This
    // is why the rating floor eases until the ask is reachable instead of the
    // row being dropped.
    for (const contract of every()) {
      expect(qualifying(contract.want).length, contract.label).toBeGreaterThan(0)
    }
  })

  it('holds steady within a window and turns over between them', () => {
    const now = 5 * CONTRACT_REFRESH_MS
    expect(contracts(now + 60_000).map((c) => c.id)).toEqual(contracts(now).map((c) => c.id))
    expect(contractWindow(now)).not.toBe(contractWindow(now + CONTRACT_REFRESH_MS))
    expect(contracts(now + CONTRACT_REFRESH_MS).map((c) => c.label)).not.toEqual(
      contracts(now).map((c) => c.label),
    )
  })

  it('never asks for, or accepts, a special', () => {
    // Specials are the rarest thing in the game; they are not errand fodder.
    const special = ALL_CARDS.find((c) => c.special)!
    for (const contract of every()) {
      expect(matchesWant(special, contract.want)).toBe(false)
    }
  })

  it('pays more than a dealer would for a qualifying car', () => {
    // The entire reason to hand a car over rather than sell it.
    for (const contract of contracts(0)) {
      const cheapest = qualifying(contract.want).reduce((a, b) =>
        bookValue(b) < bookValue(a) ? b : a,
      )
      expect(contract.reward, contract.label).toBeGreaterThan(bidPrice(cheapest, 0))
    }
  })

  it('cannot be farmed for more than its daily ceiling', () => {
    // Contracts are a bounded faucet, like the free pack: the ceiling is how
    // many stand at once times how often they turn over. Left unbounded at
    // 8-hourly they paid nearly €9.000 a day on their own, which cut a top car
    // from a 28-day chase to six days.
    let paid = 0
    let count = 0
    for (const contract of every()) {
      paid += contract.reward
      count++
      expect(contract.reward).toBeLessThanOrEqual(MAX_DAILY_CONTRACT_REWARD)
    }
    const perDay = (paid / count) * CONTRACT_COUNT * (86_400_000 / CONTRACT_REFRESH_MS)
    expect(perDay, 'contracts alone should not out-earn the rest of the game').toBeLessThan(6_000)
  })

  it('only matches cars that genuinely meet the terms', () => {
    for (const contract of contracts(0)) {
      for (const card of qualifying(contract.want)) {
        const { make, country, tier, rare, minOverall } = contract.want
        if (make) expect(card.make).toBe(make)
        if (country) expect(card.country).toBe(country)
        if (tier) expect(card.tier).toBe(tier)
        if (rare) expect(card.rare).toBe(true)
        if (minOverall !== undefined) expect(card.overall).toBeGreaterThanOrEqual(minOverall)
      }
    }
  })
})
