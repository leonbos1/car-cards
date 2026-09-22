import { beforeEach, describe, expect, it } from 'vitest'
import { STARTING_BALANCE, quickSellValue } from '../game/economy'
import { SEASON_BY_ID, roundEvent, seasonBonus, type Season } from '../game/championships'
import { bidPrice } from '../game/market'
import { ALL_CARDS } from '../game/pack'
import { eligible, fitness } from '../game/race'
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

function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

/** The best-suited eligible car for each round, never repeating one. */
function bestDistinct(season: Season): string[] {
  const picked: string[] = []
  season.rounds.forEach((_, i) => {
    const event = roundEvent(season, i)
    const best = [...eligible(event)]
      .sort((a, b) => fitness(b, event) - fitness(a, event))
      .find((c) => !picked.includes(c.id))!
    picked.push(best.id)
  })
  return picked
}

describe('championship seasons', () => {
  const CLUB = SEASON_BY_ID.get('club-championship')!

  it('will not start a second season over one still being raced', () => {
    expect(useGame.getState().startSeason(CLUB.id)).toBe(true)
    expect(useGame.getState().startSeason('rookie-cup')).toBe(false)
    expect(useGame.getState().season?.seasonId).toBe(CLUB.id)
    expect(useGame.getState().startSeason('no-such-season')).toBe(false)
  })

  it('refuses a car you do not own, one the round turns away, or one already raced', () => {
    const cars = bestDistinct(CLUB)
    const ineligible = ALL_CARDS.find((c) => !eligible(roundEvent(CLUB, 0)).some((e) => e.id === c.id))!
    give({ [cars[0]]: 1, [cars[1]]: 1, [ineligible.id]: 1 })
    useGame.getState().startSeason(CLUB.id)

    expect(useGame.getState().runSeasonRound(cars[2]), 'not owned').toBeNull()
    expect(useGame.getState().runSeasonRound(ineligible.id), 'not eligible').toBeNull()
    expect(useGame.getState().season?.rounds).toHaveLength(0)

    expect(useGame.getState().runSeasonRound(cars[0], seeded(1))).not.toBeNull()
    // The same car cannot start a second round, even one it would suit.
    expect(useGame.getState().runSeasonRound(cars[0]), 'already raced').toBeNull()
    expect(useGame.getState().season?.rounds).toHaveLength(1)
  })

  it('pays every round, then the title exactly once, and records it', () => {
    const cars = bestDistinct(CLUB)
    give(Object.fromEntries(cars.map((id) => [id, 1])))
    useGame.getState().startSeason(CLUB.id)

    const rng = seeded(7)
    let roundMoney = 0
    for (const id of cars) roundMoney += useGame.getState().runSeasonRound(id, rng)!.payout

    const { season, balance, seasonTitles } = useGame.getState()
    expect(season?.final?.position).toBe(1)
    expect(season?.final?.bonus).toBe(seasonBonus(CLUB, 1))
    expect(balance).toBe(roundMoney + seasonBonus(CLUB, 1))
    expect(seasonTitles[CLUB.id]).toBe(1)

    // A finished season takes no more rounds, and closing it pays nothing more.
    expect(useGame.getState().runSeasonRound(null)).toBeNull()
    useGame.getState().closeSeason()
    expect(useGame.getState().balance).toBe(balance)
    expect(useGame.getState().season).toBeNull()
    // And a new season can start once the old one is closed.
    expect(useGame.getState().startSeason(CLUB.id)).toBe(true)
  })

  it('forfeits title money when closed mid-season, but keeps what the rounds paid', () => {
    const cars = bestDistinct(CLUB)
    give(Object.fromEntries(cars.map((id) => [id, 1])))
    useGame.getState().startSeason(CLUB.id)
    const paid = useGame.getState().runSeasonRound(cars[0], seeded(2))!.payout

    useGame.getState().closeSeason()
    expect(useGame.getState().season).toBeNull()
    expect(useGame.getState().balance).toBe(paid)
    expect(useGame.getState().seasonTitles[CLUB.id]).toBeUndefined()
  })

  it('lets you sit a round out, which uses no car and scores nothing', () => {
    give({})
    useGame.getState().startSeason(CLUB.id)
    const result = useGame.getState().runSeasonRound(null, seeded(4))!
    expect(result.position).toBeNull()
    expect(useGame.getState().season?.used).toEqual([])
    expect(useGame.getState().season?.rounds).toHaveLength(1)
    expect(useGame.getState().balance).toBe(0)
  })
})

