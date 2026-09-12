import { describe, expect, it } from 'vitest'
import { PACKS } from '../data/packs'
import { quickSellValue } from './economy'
import { ALL_CARDS, openPack, poolFor } from './pack'
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
      expect(card.overall).toBe(overall(card.stats))
      expect(card.tier).toBe(tierOf(card.overall))
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

  it('always returns exactly pack.size cards', () => {
    for (const pack of PACKS) {
      for (let seed = 0; seed < 50; seed++) {
        expect(openPack(pack, seeded(seed)).length).toBe(pack.size)
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
          Math.min(pack.guaranteedRare, pack.size - specials.length),
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
      expect(pack.size, `${pack.name} is bigger than its pool`).toBeLessThanOrEqual(available)
      // A rare guarantee that outruns the rare pool would force duplicates.
      expect(pack.guaranteedRare).toBeLessThanOrEqual(poolFor(pack, true).length)
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

describe('published odds match the puller', () => {
  it('uses the same rare chance the store shows', () => {
    for (const pack of PACKS) {
      const published = pack.odds.rates.find((r) => r.label.startsWith('Rare'))
      if (!published) continue
      // An all-rare pack publishes 100%, which already covers its guarantee.
      if (pack.allRare) {
        expect(published.chance).toBe(1)
        continue
      }
      // Otherwise a guarantee has to be spelled out in the label the store shows.
      if (pack.guaranteedRare > 0) {
        expect(published.label).toContain(String(pack.guaranteedRare))
      }
    }
  })

  it('publishes the same special chance it rolls', () => {
    for (const pack of PACKS) {
      const published = pack.odds.rates.find((r) => r.label === 'Special')
      expect(published?.chance ?? 0).toBe(pack.specialChance)
    }
  })

  it('describes the right pack size and rating floor', () => {
    for (const pack of PACKS) {
      expect(pack.odds.contents).toContain(String(pack.size))
      if (pack.minOverall !== undefined) {
        expect(pack.odds.contents).toContain(String(pack.minOverall))
      }
    }
  })
})

describe('quick-sell', () => {
  it('is always positive and rises with rarity', () => {
    for (const card of ALL_CARDS) expect(quickSellValue(card)).toBeGreaterThan(0)

    const bronze = ALL_CARDS.find((c) => c.tier === 'bronze' && !c.rare)!
    const bronzeRare = ALL_CARDS.find((c) => c.tier === 'bronze' && c.rare)!
    const gold = ALL_CARDS.find((c) => c.tier === 'gold' && !c.rare && !c.special)!
    const special = ALL_CARDS.find((c) => c.special)!

    expect(quickSellValue(bronze)).toBeLessThan(quickSellValue(bronzeRare))
    expect(quickSellValue(bronzeRare)).toBeLessThan(quickSellValue(gold))
    expect(quickSellValue(gold)).toBeLessThan(quickSellValue(special))
  })
})
