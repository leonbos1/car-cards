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

  it('leaves the very best cars to the market', () => {
    // The rarest supercars (98-99) stay off packs entirely. Everything else can be
    // packed. Premium Gold can reach 97, but the true hypercars (98-99) are only
    // obtained through the market at full value.
    const best = Math.max(...ALL_CARDS.filter((c) => !c.special).map((c) => c.overall))

    for (const pack of PACKS) {
      let reach = 0
      for (let i = 0; i < pack.tiers.length; i++) {
        for (const card of [...slotPool(pack, i, true), ...slotPool(pack, i, false)]) {
          reach = Math.max(reach, card.overall)
        }
      }
      expect(reach, `${pack.name} can deal a ${reach}`).toBeLessThan(best - 1)
    }
  })

  it('makes a top car cost far more than the dearest pack', () => {
    // Premium Gold packs now reach 96-rated supercars, so the cost ratio is
    // tighter than it was. The absolute best cars (98-99) still cost more than
    // 4× the dearest pack, keeping them strictly market-only.
    const dearestPack = Math.max(...PAID.map((p) => p.price))
    const topCar = Math.max(...ALL_CARDS.filter((c) => !c.special).map((c) => bookValue(c)))
    expect(topCar).toBeGreaterThan(dearestPack * 4)
  })

  it('never deals a single card worth more than the whole pack', () => {
    // A rating ceiling is a proxy; this is the thing it stands for. If one card
    // in a pack could be sold for more than the pack costs, the pack is a
    // lottery ticket you can print money with, however unlikely that card is.
    // Specials are exempt: they are the deliberate jackpot, capped at 0.4%.
    for (const pack of PAID) {
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
