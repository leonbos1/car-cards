import { ALL_CARDS } from './pack'
import type { CardView } from '../types'
import type { Stat } from './race'

/**
 * Tuning contracts: "Deliver a car with 90+ handling" or "sub-2.0s 0-100".
 * Match the spec with a car from your collection and earn a bonus.
 * Harder to match than buyer contracts (more specific), so pays more.
 */

export interface TuningSpec {
  id: string
  stat: Stat
  operator: 'min' | 'max'
  value: number
}

export interface TuningContract {
  id: string
  spec: TuningSpec
  reward: number
  /** Time window for contract generation. */
  window: number
}

/** Window function (same as buyer contracts). */
export function tuningWindow(now = Date.now()): number {
  return Math.floor(now / (6 * 60 * 60 * 1000)) // 6h windows
}

/**
 * Generate tuning specs deterministically.
 * Wider range than buyer contracts: any valid stat with a percentile-based threshold.
 */
function generateSpecs(window: number): TuningSpec[] {
  const stats: Stat[] = ['hp', 'acc', 'topspeed', 'weight', 'handling', 'wowFactor']
  const lowerIsBetter = new Set(['acc', 'weight'])
  const specs: TuningSpec[] = []

  for (let i = 0; i < 4; i++) {
    const statIdx = Math.abs(Math.sin(window * 100 + i * 12.9898) * 100) % stats.length
    const stat = stats[Math.floor(statIdx)]
    const operator = lowerIsBetter.has(stat) ? 'max' : 'min'

    // Threshold: 60th-75th percentile of the pool for difficulty
    const values = ALL_CARDS.map((c) => c.stats[stat as keyof typeof c.stats] || 0).sort((a, b) => a - b)
    const threshold = values[Math.floor(values.length * (0.6 + Math.random() * 0.15))]

    specs.push({
      id: `${window}-${i}`,
      stat,
      operator,
      value: Math.round(threshold),
    })
  }
  return specs
}

/**
 * Reward for a tuning contract: harder to match than buyer contracts,
 * so higher reward (60-150 euros, vs 20-50 for buyer contracts).
 */
function rewardForSpec(spec: TuningSpec): number {
  const matching = ALL_CARDS.filter((c) => matchesSpec(c, spec))
  const difficulty = Math.max(1, ALL_CARDS.length / matching.length)
  return Math.max(60, Math.min(150, Math.round(difficulty * 50)))
}

/** Does a car meet the spec? */
export function matchesSpec(card: CardView, spec: TuningSpec): boolean {
  const value = card.stats[spec.stat as keyof typeof card.stats] ?? 0
  if (spec.operator === 'min') return value >= spec.value
  return value <= spec.value
}

/** All active tuning contracts. */
export function tuningContracts(now = Date.now()): TuningContract[] {
  const window = tuningWindow(now)
  const specs = generateSpecs(window)
  return specs.map((spec) => ({
    id: spec.id,
    spec,
    reward: rewardForSpec(spec),
    window,
  }))
}

/** Qualify for a contract? */
export function canFulfillTuningContract(
  card: CardView,
  contract: TuningContract,
): boolean {
  return matchesSpec(card, contract.spec)
}

/** Cars that match a contract spec. */
export function matchingCars(contract: TuningContract): CardView[] {
  return ALL_CARDS.filter((c) => matchesSpec(c, contract.spec))
}
