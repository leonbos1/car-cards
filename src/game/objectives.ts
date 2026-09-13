import type { CardView } from '../types'
import { ALL_CARDS } from './pack'

/**
 * One-off payouts for collection milestones.
 *
 * Selling duplicates only recycles money and every pack is priced to lose you
 * some, so without these the daily pack is the entire income and a Hypercar
 * Pack is three months away. Objectives are what actually pays for the top of
 * the ladder, and they pay for collecting rather than for grinding — which is
 * the behaviour worth rewarding in a collection game.
 */
export interface Objective {
  id: string
  name: string
  detail: string
  reward: number
  target: number
  progress: (state: ObjectiveState) => number
}

export interface ObjectiveState {
  /** One entry per distinct car owned. */
  owned: CardView[]
  packsOpened: number
}

const distinctMakes = (owned: CardView[]) => new Set(owned.map((c) => c.make)).size
const ratedAtLeast = (owned: CardView[], rating: number) =>
  owned.filter((c) => c.overall >= rating).length

const BRONZE_TOTAL = ALL_CARDS.filter((c) => c.cardClass === 'bronze').length

/** Ordered easiest first, which is also the order the panel shows them in. */
export const OBJECTIVES: Objective[] = [
  {
    id: 'collect-10', name: 'Getting started', detail: 'Own 10 different cars',
    reward: 1_000, target: 10, progress: (s) => s.owned.length,
  },
  {
    id: 'first-rare', name: 'Something special', detail: 'Own a rare car',
    reward: 1_500, target: 1, progress: (s) => s.owned.filter((c) => c.rare).length,
  },
  {
    id: 'collect-25', name: 'A proper garage', detail: 'Own 25 different cars',
    reward: 2_500, target: 25, progress: (s) => s.owned.length,
  },
  {
    id: 'first-gold', name: 'Gold standard', detail: 'Own a gold car',
    reward: 2_000, target: 1, progress: (s) => s.owned.filter((c) => c.tier === 'gold').length,
  },
  {
    id: 'makes-10', name: 'Brand curious', detail: 'Own cars from 10 different makes',
    reward: 3_000, target: 10, progress: (s) => distinctMakes(s.owned),
  },
  {
    id: 'packs-10', name: 'Warmed up', detail: 'Open 10 packs',
    reward: 2_000, target: 10, progress: (s) => s.packsOpened,
  },
  {
    id: 'collect-50', name: 'Collector', detail: 'Own 50 different cars',
    reward: 5_000, target: 50, progress: (s) => s.owned.length,
  },
  {
    id: 'rated-85', name: 'Quick', detail: 'Own a car rated 85 or better',
    reward: 5_000, target: 1, progress: (s) => ratedAtLeast(s.owned, 85),
  },
  {
    id: 'makes-25', name: 'Well connected', detail: 'Own cars from 25 different makes',
    reward: 10_000, target: 25, progress: (s) => distinctMakes(s.owned),
  },
  {
    id: 'collect-100', name: 'Serious money', detail: 'Own 100 different cars',
    reward: 12_000, target: 100, progress: (s) => s.owned.length,
  },
  {
    id: 'rated-90', name: 'Very quick', detail: 'Own a car rated 90 or better',
    reward: 15_000, target: 1, progress: (s) => ratedAtLeast(s.owned, 90),
  },
  {
    id: 'packs-50', name: 'Regular', detail: 'Open 50 packs',
    reward: 8_000, target: 50, progress: (s) => s.packsOpened,
  },
  {
    id: 'bronze-complete', name: 'Every last one', detail: `Own all ${BRONZE_TOTAL} bronze cars`,
    reward: 40_000, target: BRONZE_TOTAL,
    progress: (s) => s.owned.filter((c) => c.cardClass === 'bronze').length,
  },
  {
    id: 'makes-50', name: 'Encyclopedic', detail: 'Own cars from 50 different makes',
    reward: 25_000, target: 50, progress: (s) => distinctMakes(s.owned),
  },
  {
    id: 'collect-250', name: 'Museum piece', detail: 'Own 250 different cars',
    reward: 35_000, target: 250, progress: (s) => s.owned.length,
  },
  {
    id: 'rated-95', name: 'Hypercar owner', detail: 'Own a car rated 95 or better',
    reward: 30_000, target: 1, progress: (s) => ratedAtLeast(s.owned, 95),
  },
  {
    id: 'first-special', name: 'One of one', detail: 'Own a special card',
    reward: 25_000, target: 1, progress: (s) => s.owned.filter((c) => c.special).length,
  },
  {
    id: 'packs-200', name: 'Devoted', detail: 'Open 200 packs',
    reward: 30_000, target: 200, progress: (s) => s.packsOpened,
  },
  {
    id: 'collect-500', name: 'Half the world', detail: 'Own 500 different cars',
    reward: 80_000, target: 500, progress: (s) => s.owned.length,
  },
]

export const TOTAL_OBJECTIVE_REWARD = OBJECTIVES.reduce((sum, o) => sum + o.reward, 0)

export interface ObjectiveProgress {
  objective: Objective
  current: number
  complete: boolean
  claimed: boolean
}

export function objectiveProgress(
  state: ObjectiveState,
  claimed: readonly string[],
): ObjectiveProgress[] {
  const done = new Set(claimed)
  return OBJECTIVES.map((objective) => {
    const current = Math.min(objective.progress(state), objective.target)
    return {
      objective,
      current,
      complete: current >= objective.target,
      claimed: done.has(objective.id),
    }
  })
}
