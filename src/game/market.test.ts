import { describe, expect, it } from 'vitest'
import { bookValue, quickSellValue } from './economy'
import {
  ASK_RATE,
  BID_RATE,
  LISTING_COUNT,
  SKEW_MIN,
  bidPrice,
  listings,
  priceMultiplier,
  pricingOf,
  restockWindow,
} from './market'
import { ALL_CARDS } from './pack'

const DAY = 86_400_000
const SAMPLE = ALL_CARDS.filter((_, i) => i % 37 === 0)

describe('market prices', () => {
  it('never pays more for a car than it charges for it', () => {
    // The whole market rests on this. If the keenest listing ever asked less
    // than a bot would pay, you could buy it, sell it straight back, and repeat
    // until you could afford anything in the game.
    expect(ASK_RATE * SKEW_MIN).toBeGreaterThan(BID_RATE)
  })

  it('loses money on an instant flip, on every listing', () => {
    for (let window = 0; window < 400; window++) {
      const now = window * 20 * 60 * 1000
      for (const listing of listings(now)) {
        expect(
          bidPrice(listing.card, now),
          `${listing.card.make} ${listing.card.model} could be flipped for profit`,
        ).toBeLessThan(listing.price)
      }
    }
  })

  it('pays much better than quick-selling', () => {
    // The reason to use the market at all.
    for (const card of SAMPLE) {
      expect(bidPrice(card, 0)).toBeGreaterThan(quickSellValue(card) * 1.5)
    }
  })

  it('moves prices day to day but holds them steady within a day', () => {
    const card = ALL_CARDS[0]
    const morning = priceMultiplier(card.id, 5 * DAY + 3_600_000)
    const evening = priceMultiplier(card.id, 5 * DAY + 20 * 3_600_000)
    expect(evening).toBe(morning)

    const moves = new Set<number>()
    for (let day = 0; day < 60; day++) moves.add(priceMultiplier(card.id, day * DAY))
    expect(moves.size, 'price never moves').toBeGreaterThan(30)
  })

  it('keeps price swings inside a believable band', () => {
    for (const card of SAMPLE) {
      for (let day = 0; day < 120; day++) {
        const m = priceMultiplier(card.id, day * DAY)
        expect(m).toBeGreaterThan(0.8)
        expect(m).toBeLessThan(1.2)
      }
    }
  })
})

describe('market listings', () => {
  it('shows a full board that is stable within its window', () => {
    const now = 1_000_000_000
    const first = listings(now)
    expect(first.length).toBe(LISTING_COUNT)
    expect(listings(now + 60_000).map((l) => l.id)).toEqual(first.map((l) => l.id))
  })

  it('restocks with different cars', () => {
    const a = listings(0)
    const b = listings(60 * 60 * 1000)
    expect(restockWindow(0)).not.toBe(restockWindow(60 * 60 * 1000))
    expect(b.map((l) => l.card.id)).not.toEqual(a.map((l) => l.card.id))
  })

  it('lists specials, but only rarely', () => {
    // Specials are the dearest things in the game and cannot realistically be
    // pulled (0.4% from a €12.000 pack), so the market is the only way anyone
    // will ever own one. It still has to feel like catching one, not shopping.
    let slots = 0
    let specials = 0
    for (let window = 0; window < 3000; window++) {
      for (const listing of listings(window * 20 * 60 * 1000)) {
        slots++
        if (listing.card.special) specials++
      }
    }
    const rate = specials / slots
    expect(rate, 'specials should show up').toBeGreaterThan(0.003)
    expect(rate, 'specials should stay rare').toBeLessThan(0.02)
  })


  it('offers both bargains and overpriced stock', () => {
    const deals: number[] = []
    for (let window = 0; window < 200; window++) {
      for (const l of listings(window * 20 * 60 * 1000)) deals.push(l.deal)
    }
    // A board of only bargains is free money; a board of only traps is pointless.
    expect(deals.some((d) => d < 1)).toBe(true)
    expect(deals.some((d) => d > 1.2)).toBe(true)
  })

  it('mixes keen and steep prices within a single board', () => {
    // Checking the spread across many boards is not enough. The hash used to
    // propagate bits upward only while this reads the top bits, so keys that
    // differed in their last character — which is exactly how slot keys are
    // built — came out nearly equal, and every listing on a board carried the
    // same markup. Ten bargains, then ten traps, and nothing worth reading.
    let boardsWithBothKinds = 0
    const boards = 200
    for (let window = 0; window < boards; window++) {
      const kinds = new Set(listings(window * 20 * 60 * 1000).map((l) => pricingOf(l.deal)))
      if (kinds.size > 1) boardsWithBothKinds++
    }
    expect(boardsWithBothKinds / boards).toBeGreaterThan(0.9)
  })

  it('prices every listing above zero and near book value', () => {
    for (const listing of listings(0)) {
      expect(listing.price).toBeGreaterThan(0)
      const book = bookValue(listing.card)
      expect(listing.price).toBeGreaterThan(book * 0.5)
      expect(listing.price).toBeLessThan(book * 2)
    }
  })
})
