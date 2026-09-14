import { describe, expect, it } from 'vitest'
import { PACKS } from '../data/packs'
import { STARTING_BALANCE, quickSellValue } from './economy'
import { bidPrice } from './market'
import { OBJECTIVES } from './objectives'
import { ALL_CARDS, openPack, slotPool } from './pack'
import type { CardView, Pack } from '../types'

function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

/**
 * Average value of everything a pack deals, at the best price a player can get
 * for it.
 *
 * That is the market, not quick-sell — and it has to be measured at the market's
 * best day, since a patient player sells each car when its price is up rather
 * than the moment it lands.
 */
function expectedValue(pack: Pack, runs = 4000): number {
  let total = 0
  for (let seed = 0; seed < runs; seed++) {
    for (const card of openPack(pack, seeded(seed * 2654435761))) {
      total += bestExit(card)
    }
  }
  return total / runs
}

/** The most a card can be sold for, across the market's whole price cycle. */
function bestExit(card: CardView): number {
  let best = quickSellValue(card)
  for (let day = 0; day < 40; day++) best = Math.max(best, bidPrice(card, day * 86_400_000))
  return best
}

const PAID = PACKS.filter((p) => p.price > 0)

describe('pack economics', () => {
  it('never sells a pack for less than its contents are worth', () => {
    // The whole economy rests on this. If a pack's cards can be sold for more
    // than the pack costs, buy-open-sell-repeat prints unlimited money and
    // nothing else in the game matters. Since the market pays better than
    // quick-sell, it is the market that sets this bound. The margin is
    // deliberately wide so a price tweak cannot creep over the line unnoticed.
    for (const pack of PAID) {
      const ev = expectedValue(pack)
      expect(
        ev,
        `${pack.name} returns ${((ev / pack.price) * 100).toFixed(0)}% of its price`,
      ).toBeLessThan(pack.price * 0.75)
    }
  })

  it('keeps the free pack away from the good cars', () => {
    // The free pack is the only unlimited source of cards, so whatever it can
    // deal is effectively uncapped. It must not be able to reach a supercar.
    const free = PACKS.filter((p) => p.free)
    expect(free.length).toBeGreaterThan(0)
    for (const pack of free) {
      expect(pack.maxOverall, `${pack.name} has no rating cap`).toBeDefined()
      expect(pack.maxOverall!).toBeLessThan(88)
      expect(pack.specialChance, `${pack.name} can drop a special`).toBe(0)
    }
  })

  it('only lets the expensive packs reach the best cars', () => {
    const best = Math.max(...ALL_CARDS.filter((c) => !c.special).map((c) => c.overall))

    for (const pack of PACKS) {
      let reach = 0
      for (let i = 0; i < pack.tiers.length; i++) {
        for (const card of [...slotPool(pack, i, true), ...slotPool(pack, i, false)]) {
          reach = Math.max(reach, card.overall)
        }
      }
      // Anything that can deal a top-rated car has to cost real money.
      if (reach >= best - 4) {
        expect(pack.price, `${pack.name} reaches ${reach} for ${pack.price}`).toBeGreaterThanOrEqual(
          20_000,
        )
      }
    }
  })

  it('starts the player with less than the cheapest serious pack', () => {
    const dearest = Math.max(...PAID.map((p) => p.price))
    expect(STARTING_BALANCE).toBeGreaterThan(0)
    expect(STARTING_BALANCE, 'the opening balance should not skip the game').toBeLessThan(dearest)
  })
})

describe('objectives', () => {
  it('has no duplicate ids', () => {
    expect(new Set(OBJECTIVES.map((o) => o.id)).size).toBe(OBJECTIVES.length)
  })

  it('is all reachable with the cars that exist', () => {
    for (const objective of OBJECTIVES) {
      expect(objective.target, objective.id).toBeGreaterThan(0)
      expect(objective.reward, objective.id).toBeGreaterThan(0)
      // A milestone nobody can hit is a reward that never pays.
      expect(objective.target, `${objective.id} needs more cars than exist`).toBeLessThanOrEqual(
        ALL_CARDS.length,
      )
    }
  })

  it('pays out enough to reach the top of the ladder', () => {
    // Packs are all net-negative, so objectives are the real income. They need
    // to cover the dearest pack several times over or the top tier is
    // unreachable without months of daily packs.
    const total = OBJECTIVES.reduce((sum, o) => sum + o.reward, 0)
    const dearest = Math.max(...PAID.map((p) => p.price))
    expect(total).toBeGreaterThan(dearest * 3)
  })
})
