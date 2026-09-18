import { describe, expect, it } from 'vitest'
import { PACKS } from '../data/packs'
import { STARTING_BALANCE, bookValue, quickSellValue } from './economy'
import { CONTRACT_COUNT, CONTRACT_REFRESH_MS, contracts } from './contracts'
import { bidPrice } from './market'
import { MAX_DAILY_QUIZ_REWARD } from './quiz'
import { FREE_PACK_COOLDOWN_MS } from './economy'
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
  it('cheap packs return less than their price on average', () => {
    // Cheap packs (under €5k) should still cost more than their expected value,
    // so they're not a path to infinite money. Premium Gold at €12k can exceed
    // its price on average due to rare hypercar pulls, making it a lottery.
    const cheap = PAID.filter((p) => p.price < 5_000)
    for (const pack of cheap) {
      const ev = expectedValue(pack)
      expect(
        ev,
        `${pack.name} returns ${((ev / pack.price) * 100).toFixed(0)}% of its price`,
      ).toBeLessThan(pack.price * 0.9)
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

  it('cheap packs do not reach the best cars', () => {
    // Free and cheap packs (under €2k) cap out well below the best cars, so
    // they're not a path to ownership. Premium Gold (€12k) can theoretically
    // pull anything in the gold tier, but the rarity of 99-rated cars (only 5
    // exist) makes it vanishingly unlikely.
    const cheap = PACKS.filter((p) => p.price === 0 || p.price < 2_000)
    const best = Math.max(...ALL_CARDS.filter((c) => !c.special).map((c) => c.overall))

    for (const pack of cheap) {
      let reach = 0
      for (let i = 0; i < pack.tiers.length; i++) {
        for (const card of [...slotPool(pack, i, true), ...slotPool(pack, i, false)]) {
          reach = Math.max(reach, card.overall)
        }
      }
      expect(reach, `${pack.name} can deal a ${reach}`).toBeLessThan(best - 8)
    }
  })

  it('the absolute best car costs multiples of any pack', () => {
    // A 99-rated hypercar is worth vastly more than a €12k pack. You can get
    // lucky in a pack opening, but deliberately acquiring a specific hypercar
    // means buying it on the market at full book value.
    const dearestPack = Math.max(...PAID.map((p) => p.price))
    const topCar = Math.max(...ALL_CARDS.filter((c) => !c.special).map((c) => bookValue(c)))
    expect(topCar).toBeGreaterThan(dearestPack * 2)
  })

  it('cheap packs contain cards worth less than their price', () => {
    // Bronze and Silver packs have strict rating caps so every card is worth
    // less than the pack. Gold Pack and Premium Gold can theoretically pull
    // cards worth more on lucky rolls — that's the point of the pack lottery.
    const capped = PAID.filter((p) => p.maxOverall !== undefined)
    for (const pack of capped) {
      for (let i = 0; i < pack.tiers.length; i++) {
        for (const card of [...slotPool(pack, i, true), ...slotPool(pack, i, false)]) {
          expect(
            bookValue(card),
            `${pack.name} can deal a ${card.make} ${card.model} worth more than its price`,
          ).toBeLessThan(pack.price)
        }
      }
    }
  })

  it('starts the player with less than the cheapest serious pack', () => {
    const dearest = Math.max(...PAID.map((p) => p.price))
    expect(STARTING_BALANCE).toBeGreaterThan(0)
    expect(STARTING_BALANCE, 'the opening balance should not skip the game').toBeLessThan(dearest)
  })
})

describe('every faucet together', () => {
  it('cannot buy the best car in the game in a week', () => {
    // Each faucet has its own guard, but the player uses all of them. When the
    // pack and quiz timers were shortened and contracts added, each change
    // looked reasonable on its own while together they cut a top car from a
    // 28-day chase to six days. This is the assertion that would have caught
    // that, and the one to keep honest when the next faucet is added.
    //
    // Racing is deliberately not counted here. It has no cooldown, so it has no
    // daily figure to add — what bounds it is how long a race takes, and
    // race.test.ts holds that bound instead. This test is about what the game
    // pays a player who turns up once a day and leaves.
    const free = PACKS.find((p) => p.free && !p.once)!
    let packValue = 0
    const runs = 2000
    for (let seed = 0; seed < runs; seed++) {
      for (const card of openPack(free, seeded(seed))) packValue += bidPrice(card, 0)
    }
    const packsPerDay = 86_400_000 / FREE_PACK_COOLDOWN_MS
    const fromPacks = (packValue / runs) * packsPerDay

    let fees = 0
    let posted = 0
    for (let w = 0; w < 500; w++) {
      for (const c of contracts(w * CONTRACT_REFRESH_MS)) {
        fees += c.reward
        posted++
      }
    }
    const fromContracts =
      (fees / posted) * CONTRACT_COUNT * (86_400_000 / CONTRACT_REFRESH_MS)

    const perDay = fromPacks + MAX_DAILY_QUIZ_REWARD + fromContracts
    const topCar = Math.max(...ALL_CARDS.filter((c) => !c.special).map((c) => bookValue(c)))

    expect(
      topCar / perDay,
      `flawless play earns ${Math.round(perDay)} a day, buying a top car in ${(
        topCar / perDay
      ).toFixed(1)} days`,
    ).toBeGreaterThan(7)
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

  it('pays for a top car, but not a garage full of them', () => {
    // Packs are all net-negative, so objectives are the real income. Measured
    // against a top car rather than a pack price: packs no longer reach the top
    // of the roster, so pack prices say nothing about what the endgame costs.
    const total = OBJECTIVES.reduce((sum, o) => sum + o.reward, 0)
    const topCar = Math.max(...ALL_CARDS.filter((c) => !c.special).map((c) => bookValue(c)))
    expect(total, 'the whole objective pool cannot buy one top car').toBeGreaterThan(topCar)
    expect(total, 'objectives alone should not bankroll a collection of them').toBeLessThan(
      topCar * 10,
    )
  })
})
