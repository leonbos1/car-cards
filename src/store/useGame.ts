import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { FREE_PACK_COOLDOWN_MS, STARTING_BALANCE, quickSellValue } from '../game/economy'
import { OBJECTIVES, objectiveProgress } from '../game/objectives'
import { ALL_CARDS } from '../game/pack'
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
  reset: () => void
}

/** Cards owned beyond the first copy of each car. */
export function duplicateCount(collection: Record<string, number>): number {
  return Object.values(collection).reduce((sum, n) => sum + Math.max(0, n - 1), 0)
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
            collection: { ...s.collection, [carId]: owned - 1 },
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

      reset: () =>
        set({
          balance: STARTING_BALANCE,
          collection: {},
          packsOpened: 0,
          lastFreePackAt: null,
          claimedObjectives: [],
        }),
    }),
    // Bumped: the old save carried a 10,000,000 balance from before there was
    // an economy, which would skip the entire game.
    { name: 'car-cards-save-v2' },
  ),
)
