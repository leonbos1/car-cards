import { describe, expect, it } from 'vitest'
import { bookValue } from '../game/economy'
import { ALL_CARDS, openPack, slotPool } from '../game/pack'
import {
  MARQUE_PACKS,
  MARQUE_PACK_CAP,
  MARQUE_PACK_PRICE,
  MARQUE_PACK_SIZE,
  MARQUE_PACK_SLOTS,
} from './packs'

function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

const RUNS = 500

describe('marque packs', () => {
  it('exists for a good spread of marques', () => {
    expect(MARQUE_PACKS.length).toBeGreaterThan(10)
    expect(new Set(MARQUE_PACKS.map((p) => p.id)).size).toBe(MARQUE_PACKS.length)
    expect(new Set(MARQUE_PACKS.map((p) => p.make)).size).toBe(MARQUE_PACKS.length)
  })

  it('all cost the same', () => {
    for (const pack of MARQUE_PACKS) expect(pack.price, pack.name).toBe(MARQUE_PACK_PRICE)
  })

  it('always deals at least the promised number of the marque', () => {
    // The whole promise of the pack. A brand slot that quietly fell back to the
    // open pool — because the marque ran out of cards, say — would break it
    // without breaking anything else.
    for (const pack of MARQUE_PACKS) {
      for (let seed = 0; seed < RUNS; seed++) {
        const cards = openPack(pack, seeded(seed))
        const mine = cards.filter((c) => c.make === pack.make).length
        expect(mine, `${pack.name} dealt ${mine} of its own marque`).toBeGreaterThanOrEqual(
          MARQUE_PACK_SLOTS,
        )
        expect(cards.length).toBe(MARQUE_PACK_SIZE)
      }
    }
  })

  it('puts the rare guarantee on the marque, not the filler', () => {
    // Guaranteed rares fill the first slots, and the first slots are the brand
    // ones. If that order ever changed, the pack would still deal two rares —
    // they would just be someone else's cars.
    for (const pack of MARQUE_PACKS) {
      for (let seed = 0; seed < RUNS; seed++) {
        const rareOwn = openPack(pack, seeded(seed)).filter(
          (c) => c.make === pack.make && c.rare,
        ).length
        expect(rareOwn, pack.name).toBeGreaterThanOrEqual(pack.guaranteedRare)
      }
    }
  })

  it('gives no marque pack to the supercar brands', () => {
    // Not a hand-written blocklist: a marque qualifies on how many of its cars
    // sit under the rating cap, and the exotica have almost none. This asserts
    // the outcome, so a future change to the cap or the roster that quietly
    // opened a €10.000 route to a Ferrari would fail here.
    const withPacks = new Set(MARQUE_PACKS.map((p) => p.make))
    const exotic = new Set(
      ALL_CARDS.filter((c) => !c.special && c.overall > MARQUE_PACK_CAP + 2).map((c) => c.make),
    )
    for (const make of exotic) {
      const reachable = ALL_CARDS.filter(
        (c) => c.make === make && !c.special && c.overall <= MARQUE_PACK_CAP,
      )
      // A marque is only barred if the cap really does leave it short.
      if (reachable.length >= 8) continue
      expect(withPacks.has(make), `${make} has a marque pack it should not`).toBe(false)
    }
  })

  it('cannot reach a car worth more than the pack costs', () => {
    for (const pack of MARQUE_PACKS) {
      for (let i = 0; i < pack.tiers.length; i++) {
        for (const card of [...slotPool(pack, i, true), ...slotPool(pack, i, false)]) {
          expect(
            bookValue(card),
            `${pack.name} can deal a ${card.make} ${card.model} worth ${bookValue(card)}`,
          ).toBeLessThan(MARQUE_PACK_PRICE)
        }
      }
    }
  })
})
