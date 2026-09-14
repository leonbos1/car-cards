import { beforeEach, describe, expect, it } from 'vitest'
import { STARTING_BALANCE, quickSellValue } from '../game/economy'
import { bidPrice } from '../game/market'
import { ALL_CARDS } from '../game/pack'
import { ownedCards, useGame } from './useGame'

const CAR = ALL_CARDS.find((c) => !c.special && !c.rare)!
const OTHER = ALL_CARDS.find((c) => c.id !== CAR.id && !c.special)!

function give(copies: Record<string, number>, balance = 0) {
  useGame.setState({ balance, collection: { ...copies } })
}

beforeEach(() => {
  useGame.getState().reset()
})

describe('selling to the market', () => {
  it('takes your last copy, which quick-sell will not', () => {
    // The market is where you trade deliberately, so it will sell anything you
    // own; quick-sell is the bulk 'dump my spares' button and keeps the guard.
    give({ [CAR.id]: 1 })
    expect(useGame.getState().sellToMarket(CAR.id)).toBeGreaterThan(0)
    expect(useGame.getState().collection[CAR.id]).toBeUndefined()

    give({ [CAR.id]: 1 })
    useGame.getState().sellOne(CAR.id)
    expect(useGame.getState().collection[CAR.id], 'quick-sell took a last copy').toBe(1)
  })

  it('leaves no zero entry behind when a car sells out', () => {
    // A zero is not ownership. Settings counted collection keys, so a leftover
    // zero would have kept reporting a car you no longer had.
    give({ [CAR.id]: 2, [OTHER.id]: 1 })
    useGame.getState().sellToMarket(CAR.id)
    expect(useGame.getState().collection[CAR.id]).toBe(1)

    useGame.getState().sellToMarket(CAR.id)
    expect(Object.keys(useGame.getState().collection)).toEqual([OTHER.id])
    expect(ownedCards(useGame.getState().collection).map((c) => c.id)).toEqual([OTHER.id])
  })

  it('credits exactly what the row offered, and never more', () => {
    give({ [CAR.id]: 1 })
    const expected = bidPrice(CAR)
    const earned = useGame.getState().sellToMarket(CAR.id)
    expect(earned).toBe(expected)
    expect(useGame.getState().balance).toBe(expected)
  })

  it('pays nothing for a car you do not own', () => {
    give({})
    expect(useGame.getState().sellToMarket(CAR.id)).toBe(0)
    expect(useGame.getState().sellToMarket('no-such-car')).toBe(0)
    expect(useGame.getState().balance).toBe(0)
  })

  it('cannot be run twice on one copy', () => {
    give({ [CAR.id]: 1 })
    const first = useGame.getState().sellToMarket(CAR.id)
    const second = useGame.getState().sellToMarket(CAR.id)
    expect(second).toBe(0)
    expect(useGame.getState().balance).toBe(first)
  })
})

describe('quick-sell', () => {
  it('keeps one of each when selling every duplicate', () => {
    give({ [CAR.id]: 3, [OTHER.id]: 1 })
    const earned = useGame.getState().sellDuplicates()
    expect(earned).toBe(quickSellValue(CAR) * 2)
    expect(useGame.getState().collection[CAR.id]).toBe(1)
    expect(useGame.getState().collection[OTHER.id]).toBe(1)
  })

  it('pays less than the market for the same car', () => {
    // The whole reason the market is worth using.
    expect(quickSellValue(CAR)).toBeLessThan(bidPrice(CAR))
  })
})

describe('the save', () => {
  it('starts with the opening stake and an empty garage', () => {
    expect(useGame.getState().balance).toBe(STARTING_BALANCE)
    expect(useGame.getState().collection).toEqual({})
  })

  it('adds pulled cards without disturbing the rest', () => {
    give({ [OTHER.id]: 1 })
    useGame.getState().add([CAR, CAR])
    expect(useGame.getState().collection[CAR.id]).toBe(2)
    expect(useGame.getState().collection[OTHER.id]).toBe(1)
  })
})
