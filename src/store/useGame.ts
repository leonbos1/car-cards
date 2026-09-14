import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { FREE_PACK_COOLDOWN_MS, STARTING_BALANCE, quickSellValue } from '../game/economy'
import { OBJECTIVES, objectiveProgress } from '../game/objectives'
import { QUIZ_CATEGORY_BY_ID } from '../data/quiz'
import { bidPrice, listings, restockWindow } from '../game/market'
import { ALL_CARDS } from '../game/pack'
import { QUIZ_COOLDOWN_MS, QUESTIONS_PER_RUN, rewardFor } from '../game/quiz'
import type { CardView } from '../types'

const CARD_BY_ID = new Map(ALL_CARDS.map((c) => [c.id, c]))
const OBJECTIVE_BY_ID = new Map(OBJECTIVES.map((o) => [o.id, o]))

interface GameState {
  balance: number
  /** carId -> copies owned. */
  collection: Record<string, number>
  /** Total packs opened, shown in the garage header. */
  packsOpened: number
  /** When the free pack was last taken, as epoch ms. */
  lastFreePackAt: number | null
  /** Objectives already paid out, so a reward is collected once. */
  claimedObjectives: string[]
  /** Quiz category id -> when it was last played, as epoch ms. */
  quizPlayedAt: Record<string, number>
  /** Listing ids already bought, so sold stock does not come back. */
  boughtListings: string[]

  canAfford: (price: number) => boolean
  /** Spend and record an opening. Returns false if the balance is short. */
  buy: (price: number) => boolean
  /** Take the free pack if the cooldown has elapsed. */
  claimFreePack: () => boolean
  /** Milliseconds until the free pack is available; 0 when it is ready. */
  freePackReadyIn: (now?: number) => number
  add: (cards: CardView[]) => void
  /** Quick-sell one copy. Refuses to sell the last copy of a car. */
  sellOne: (carId: string) => void
  /** Quick-sell every duplicate, keeping one of each. Returns euros earned. */
  sellDuplicates: () => number
  /** Pay out a completed objective. Returns euros earned, or 0. */
  claimObjective: (id: string) => number
  /** Milliseconds until a quiz category can be played again; 0 when ready. */
  quizReadyIn: (categoryId: string, now?: number) => number
  /** Bank a finished quiz run and start its cooldown. Returns euros earned. */
  finishQuiz: (categoryId: string, correct: number) => number
  /** Buy a listing off the market. Returns false if it is gone or unaffordable. */
  buyListing: (listingId: string) => boolean
  /**
   * Sell one copy to the market at today's bid, including your last copy.
   * Returns euros earned.
   */
  sellToMarket: (carId: string) => number
  reset: () => void
}

/**
 * The collection with one copy of a car removed.
 *
 * A car sold down to nothing is dropped rather than left at zero: a zero entry
 * is not ownership, and anything counting keys instead of values would go on
 * reporting it forever.
 */
function withOneFewer(
  collection: Record<string, number>,
  carId: string,
): Record<string, number> {
  const next = { ...collection }
  const left = (next[carId] ?? 0) - 1
  if (left > 0) next[carId] = left
  else delete next[carId]
  return next
}

/** The distinct cars owned, resolved to cards. */
export function ownedCards(collection: Record<string, number>): CardView[] {
  return Object.entries(collection)
    .filter(([, n]) => n > 0)
    .map(([id]) => CARD_BY_ID.get(id))
    .filter((c): c is CardView => Boolean(c))
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      balance: STARTING_BALANCE,
      collection: {},
      packsOpened: 0,
      lastFreePackAt: null,
      claimedObjectives: [],
      quizPlayedAt: {},
      boughtListings: [],

      canAfford: (price) => get().balance >= price,

      buy: (price) => {
        if (get().balance < price) return false
        set((s) => ({ balance: s.balance - price, packsOpened: s.packsOpened + 1 }))
        return true
      },

      freePackReadyIn: (now = Date.now()) => {
        const last = get().lastFreePackAt
        if (last === null) return 0
        // A clock moved backwards should not lock the pack away for months.
        return Math.max(0, Math.min(FREE_PACK_COOLDOWN_MS, last + FREE_PACK_COOLDOWN_MS - now))
      },

      claimFreePack: () => {
        if (get().freePackReadyIn() > 0) return false
        set((s) => ({ lastFreePackAt: Date.now(), packsOpened: s.packsOpened + 1 }))
        return true
      },

      add: (cards) =>
        set((s) => {
          const collection = { ...s.collection }
          for (const card of cards) collection[card.id] = (collection[card.id] ?? 0) + 1
          return { collection }
        }),

      sellOne: (carId) =>
        set((s) => {
          const owned = s.collection[carId] ?? 0
          const card = CARD_BY_ID.get(carId)
          // Selling your only copy would punch a hole in the collection.
          if (!card || owned < 2) return s
          const value = quickSellValue(card)
          return {
            balance: s.balance + value,
            collection: withOneFewer(s.collection, carId),
          }
        }),

      sellDuplicates: () => {
        const { collection } = get()
        let earned = 0
        const next: Record<string, number> = {}
        for (const [carId, owned] of Object.entries(collection)) {
          const card = CARD_BY_ID.get(carId)
          if (card && owned > 1) earned += quickSellValue(card) * (owned - 1)
          next[carId] = Math.min(owned, 1)
        }
        if (earned > 0) {
          set((s) => ({ balance: s.balance + earned, collection: next }))
        }
        return earned
      },

      claimObjective: (id) => {
        const state = get()
        const objective = OBJECTIVE_BY_ID.get(id)
        if (!objective || state.claimedObjectives.includes(id)) return 0

        const [progress] = objectiveProgress(
          { owned: ownedCards(state.collection), packsOpened: state.packsOpened },
          state.claimedObjectives,
        ).filter((p) => p.objective.id === id)
        if (!progress?.complete) return 0

        set((s) => ({
          balance: s.balance + objective.reward,
          claimedObjectives: [...s.claimedObjectives, id],
        }))
        return objective.reward
      },

      quizReadyIn: (categoryId, now = Date.now()) => {
        const last = get().quizPlayedAt[categoryId]
        if (last === undefined) return 0
        // Clamp, so a clock that jumps backwards cannot lock a category away.
        return Math.max(0, Math.min(QUIZ_COOLDOWN_MS, last + QUIZ_COOLDOWN_MS - now))
      },

      finishQuiz: (categoryId, correct) => {
        // The cooldown is checked here rather than in the component, so the
        // payout cannot be repeated by reopening the quiz. The reward is worked
        // out here too, from the number of correct answers, so the amount paid
        // is bounded by the category rather than by whatever the caller asks
        // for.
        const category = QUIZ_CATEGORY_BY_ID.get(categoryId)
        if (!category || get().quizReadyIn(categoryId) > 0) return 0
        const earned = rewardFor(category, Math.min(correct, QUESTIONS_PER_RUN))
        set((s) => ({
          balance: s.balance + earned,
          quizPlayedAt: { ...s.quizPlayedAt, [categoryId]: Date.now() },
        }))
        return earned
      },

      buyListing: (listingId) => {
        const state = get()
        if (state.boughtListings.includes(listingId)) return false
        const listing = listings().find((l) => l.id === listingId)
        if (!listing || state.balance < listing.price) return false

        set((s) => ({
          balance: s.balance - listing.price,
          collection: { ...s.collection, [listing.card.id]: (s.collection[listing.card.id] ?? 0) + 1 },
          // Only this window's sold listings matter; older ids can never
          // reappear, so drop them rather than growing the save forever.
          boughtListings: [...s.boughtListings, listingId].filter((id) =>
            id.startsWith(`${restockWindow()}:`),
          ),
        }))
        return true
      },

      sellToMarket: (carId) => {
        const state = get()
        const card = CARD_BY_ID.get(carId)
        const owned = state.collection[carId] ?? 0
        // Unlike quick-sell, the market will take your only copy. This is where
        // you come to trade deliberately; refusing to sell a car you no longer
        // want made the market half a feature. The UI confirms a last copy.
        if (!card || owned < 1) return 0

        const price = bidPrice(card)
        set((s) => ({
          balance: s.balance + price,
          collection: withOneFewer(s.collection, carId),
        }))
        return price
      },

      reset: () =>
        set({
          balance: STARTING_BALANCE,
          collection: {},
          packsOpened: 0,
          lastFreePackAt: null,
          claimedObjectives: [],
          quizPlayedAt: {},
          boughtListings: [],
        }),
    }),
    // Bumped: the old save carried a 10,000,000 balance from before there was
    // an economy, which would skip the entire game.
    { name: 'car-cards-save-v2' },
  ),
)
