import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STARTING_BALANCE, quickSellValue } from '../game/economy'
import { ALL_CARDS } from '../game/pack'
import type { CardView } from '../types'

const CARD_BY_ID = new Map(ALL_CARDS.map((c) => [c.id, c]))

interface GameState {
  balance: number
  /** carId -> copies owned. */
  collection: Record<string, number>
  /** Total packs opened, shown in the garage header. */
  packsOpened: number

  canAfford: (price: number) => boolean
  /** Spend and record an opening. Returns false if the balance is short. */
  buy: (price: number) => boolean
  add: (cards: CardView[]) => void
  /** Quick-sell one copy. Refuses to sell the last copy of a car. */
  sellOne: (carId: string) => void
  /** Quick-sell every duplicate, keeping one of each. Returns euros earned. */
  sellDuplicates: () => number
  reset: () => void
}

/** Cards owned beyond the first copy of each car. */
export function duplicateCount(collection: Record<string, number>): number {
  return Object.values(collection).reduce((sum, n) => sum + Math.max(0, n - 1), 0)
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      balance: STARTING_BALANCE,
      collection: {},
      packsOpened: 0,

      canAfford: (price) => get().balance >= price,

      buy: (price) => {
        if (get().balance < price) return false
        set((s) => ({ balance: s.balance - price, packsOpened: s.packsOpened + 1 }))
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
          return {
            balance: s.balance + quickSellValue(card),
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
        if (earned > 0) set((s) => ({ balance: s.balance + earned, collection: next }))
        return earned
      },

      reset: () => set({ balance: STARTING_BALANCE, collection: {}, packsOpened: 0 }),
    }),
    { name: 'car-cards-save-v1' },
  ),
)
