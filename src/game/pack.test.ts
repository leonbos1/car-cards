import { describe, expect, it } from 'vitest'
import { PACKS } from '../data/packs'
import { quickSellValue } from './economy'
import { ALL_CARDS, openPack, poolFor, slotPool } from './pack'
import { overall, tierOf } from './rating'

/** Deterministic RNG so a failure is reproducible. */
function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

describe('ratings', () => {
  it('derives each card tier from its own rating', () => {
    for (const card of ALL_CARDS) {
      expect(card.overall).toBe(overall(card.stats, card.year))
      // Special cards always tier as gold; others derive from their rating
      const expectedTier = card.special ? 'gold' : tierOf(card.overall)
      expect(card.tier).toBe(expectedTier)
    }
  })

  it('keeps every special card in gold', () => {
    for (const card of ALL_CARDS.filter((c) => c.special)) {
      expect(card.tier).toBe('gold')
      expect(card.cardClass).toBe('special')
    }
  })

  it('has no duplicate ids', () => {
    expect(new Set(ALL_CARDS.map((c) => c.id)).size).toBe(ALL_CARDS.length)
  })
})

describe('pack pools', () => {
  it('never puts a special in a normal slot', () => {
    for (const pack of PACKS) {
      for (const rare of [true, false]) {
        expect(poolFor(pack, rare).every((c) => !c.special)).toBe(true)
      }
    }
  })

  it('gives every pack something to draw', () => {
    for (const pack of PACKS) {
      expect(poolFor(pack, true).length + poolFor(pack, false).length).toBeGreaterThan(0)
    }
  })
})

describe('openPack', () => {
  const RUNS = 2000

  it('deals exactly one card per slot', () => {
    for (const pack of PACKS) {
      for (let seed = 0; seed < 50; seed++) {
        expect(openPack(pack, seeded(seed)).length).toBe(pack.tiers.length)
      }
    }
  })

  it('deals the tier mix it advertises', () => {
    // The store reads its drop rates off pack.tiers, so the cards dealt have to
    // match that composition exactly — not merely come from those tiers. This
    // is what stopped the free pack quietly dealing eight cards from the
    // combined pool, where gold outnumbers bronze seven to one.
    for (const pack of PACKS) {
      const promised = [...pack.tiers].sort().join(',')
      for (let seed = 0; seed < RUNS; seed++) {
        const cards = openPack(pack, seeded(seed))
        if (cards.some((c) => c.special)) continue // a special displaces one slot
        expect(cards.map((c) => c.tier).sort().join(','), pack.name).toBe(promised)
      }
    }
  })

  it('never deals a card above the pack rating cap', () => {
    // This is what keeps supercars rare: no run of luck gets a hypercar out of
    // a cheap pack, because the pack cannot reach one at all.
    for (const pack of PACKS.filter((p) => p.maxOverall !== undefined)) {
      for (let seed = 0; seed < RUNS; seed++) {
        for (const card of openPack(pack, seeded(seed))) {
          if (card.special) continue
          expect(card.overall, `${pack.name} dealt a ${card.overall}`).toBeLessThanOrEqual(
            pack.maxOverall!,
          )
        }
      }
    }
  })

  it('guarantees the headline card on packs that promise one', () => {
    for (const pack of PACKS.filter((p) => p.headlinerMinOverall !== undefined)) {
      for (let seed = 0; seed < RUNS; seed++) {
        const cards = openPack(pack, seeded(seed))
        const best = Math.max(...cards.map((c) => c.overall))
        expect(best, pack.name).toBeGreaterThanOrEqual(pack.headlinerMinOverall!)
      }
    }
  })

  it('honours tier, rare guarantees and rating floors', () => {
    for (const pack of PACKS) {
      for (let seed = 0; seed < RUNS; seed++) {
        const cards = openPack(pack, seeded(seed))
        const specials = cards.filter((c) => c.special)
        const normal = cards.filter((c) => !c.special)

        // Every non-special card sits in a tier the pack declares.
        for (const card of normal) expect(pack.tiers).toContain(card.tier)

        // The rating floor applies to the cards the pack actually promises.
        if (pack.minOverall !== undefined) {
          for (const card of normal) expect(card.overall).toBeGreaterThanOrEqual(pack.minOverall)
        }

        // A special replaces one slot, so the guarantee is met by the rest.
        const rares = cards.filter((c) => c.rare).length
        expect(rares).toBeGreaterThanOrEqual(
          Math.min(pack.guaranteedRare, pack.tiers.length - specials.length),
        )

        if (pack.allRare) {
          for (const card of normal) expect(card.rare).toBe(true)
        }

        // At most one special per pack.
        expect(specials.length).toBeLessThanOrEqual(1)
      }
    }
  })

  it('fills every pack with distinct cars', () => {
    // Each pack is sized to its pool, so no pack should ever repeat a car.
    for (const pack of PACKS) {
      for (let seed = 0; seed < RUNS; seed++) {
        const cards = openPack(pack, seeded(seed))
        const ids = new Set(cards.map((c) => c.id))
        expect(ids.size, `${pack.name} repeated a car`).toBe(cards.length)
      }
    }
  })

  it('never asks a pool for more cards than it holds', () => {
    for (const pack of PACKS) {
      const available = poolFor(pack, true).length + poolFor(pack, false).length
      expect(pack.tiers.length, `${pack.name} is bigger than its pool`).toBeLessThanOrEqual(
        available,
      )
      // A rare guarantee that outruns the rare pool would force duplicates.
      expect(pack.guaranteedRare).toBeLessThanOrEqual(poolFor(pack, true).length)

      // Each slot needs enough distinct cards of its own tier to fill the pack.
      for (let i = 0; i < pack.tiers.length; i++) {
        const slot = slotPool(pack, i, true).length + slotPool(pack, i, false).length
        expect(slot, `${pack.name} slot ${i} (${pack.tiers[i]}) is empty`).toBeGreaterThan(
          pack.tiers.length,
        )
      }
    }
  })

  it('sorts each pack so the best card is revealed last', () => {
    for (const pack of PACKS) {
      const cards = openPack(pack, seeded(7))
      const ratings = cards.map((c) => c.overall)
      expect([...ratings].sort((a, b) => a - b)).toEqual(ratings)
    }
  })

  it('produces specials at roughly the declared rate', () => {
    for (const pack of PACKS.filter((p) => p.specialChance > 0)) {
      let hits = 0
      for (let seed = 0; seed < RUNS; seed++) {
        if (openPack(pack, seeded(seed * 2654435761)).some((c) => c.special)) hits++
      }
      const observed = hits / RUNS
      // Generous tolerance: this guards against a broken roll, not RNG noise.
      expect(observed).toBeGreaterThan(pack.specialChance * 0.5)
      expect(observed).toBeLessThan(pack.specialChance * 1.8)
    }
  })

  it('never drops a special from a pack that does not offer one', () => {
    for (const pack of PACKS.filter((p) => p.specialChance === 0)) {
      for (let seed = 0; seed < RUNS; seed++) {
        expect(openPack(pack, seeded(seed)).some((c) => c.special)).toBe(false)
      }
    }
  })
})

describe('quick-sell', () => {
  it('always pays something', () => {
    for (const card of ALL_CARDS) expect(quickSellValue(card)).toBeGreaterThan(0)
  })

  it('pays more for a better car', () => {
    // Value tracks rating rather than tier, so a rare bronze is deliberately
    // worth more than a common silver — the same way a rare bronze outsells a
    // common silver in FUT. What has to hold is that within one rarity, the
    // better car always pays more.
    for (const rare of [false, true]) {
      const band = ALL_CARDS.filter((c) => !c.special && c.rare === rare).sort(
        (a, b) => a.overall - b.overall,
      )
      for (let i = 1; i < band.length; i++) {
        expect(quickSellValue(band[i])).toBeGreaterThanOrEqual(quickSellValue(band[i - 1]))
      }
      expect(quickSellValue(band.at(-1)!)).toBeGreaterThan(quickSellValue(band[0]))
    }
  })

  it('pays a premium for rare and special cards', () => {
    const sample = ALL_CARDS.filter((c) => !c.special && !c.rare).slice(0, 40)
    for (const common of sample) {
      const asRare = { ...common, rare: true }
      const asSpecial = { ...common, special: { label: 'TEST' } }
      expect(quickSellValue(asRare)).toBeGreaterThan(quickSellValue(common))
      expect(quickSellValue(asSpecial)).toBeGreaterThan(quickSellValue(asRare))
    }
  })
})
