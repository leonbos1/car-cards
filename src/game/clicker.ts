/** Base money earned per click. */
const BASE_CLICK_VALUE = 1

/** Upgrades available in the clicker. */
export interface ClickerUpgrade {
  id: string
  name: string
  description: string
  cost: number
  effect: number
  maxLevel?: number
}

/**
 * Clicker upgrade catalog.
 * Each upgrade multiplies the base click value.
 */
export const CLICKER_UPGRADES: ClickerUpgrade[] = [
  {
    id: 'click-multiplier-1',
    name: 'Faster Reflexes',
    description: '+50% per click',
    cost: 5,
    effect: 0.5,
  },
  {
    id: 'click-multiplier-2',
    name: 'Professional Driver',
    description: '+100% per click',
    cost: 50,
    effect: 1.0,
  },
  {
    id: 'click-multiplier-3',
    name: 'Champion',
    description: '+200% per click',
    cost: 500,
    effect: 2.0,
  },
  {
    id: 'combo-multiplier-1',
    name: 'Rhythm',
    description: 'Consecutive clicks earn 2× per combo',
    cost: 25,
    effect: 1.0,
  },
  {
    id: 'combo-multiplier-2',
    name: 'Flow State',
    description: 'Consecutive clicks earn 3× per combo',
    cost: 250,
    effect: 2.0,
  },
  {
    id: 'auto-click-1',
    name: 'Power Steering',
    description: 'Earn €0.50 per second',
    cost: 100,
    effect: 0.5,
  },
  {
    id: 'auto-click-2',
    name: 'Turbo Engine',
    description: 'Earn €2 per second',
    cost: 1000,
    effect: 2.0,
  },
]

/** Clicker game state. */
export interface ClickerState {
  /** Total lifetime clicks. */
  totalClicks: number
  /** Current combo streak. */
  comboStreak: number
  /** When the last click happened, for combo timeout. */
  lastClickAt: number
  /** Purchased upgrade ids and their levels. */
  boughtUpgrades: Record<string, number>
  /** Total money earned from clicking (not including other sources). */
  clickerEarnings: number
}

export const DEFAULT_CLICKER_STATE: ClickerState = {
  totalClicks: 0,
  comboStreak: 0,
  lastClickAt: 0,
  boughtUpgrades: {},
  clickerEarnings: 0,
}

/**
 * Calculate total multiplier from all purchased upgrades.
 * Returns {clickMultiplier, comboMultiplier, autoClickPerSec}
 */
export function calculateClickerMultipliers(boughtUpgrades: Record<string, number>) {
  let clickMultiplier = BASE_CLICK_VALUE
  let comboMultiplier = 1
  let autoClickPerSec = 0

  for (const [upgradeId, level] of Object.entries(boughtUpgrades)) {
    const upgrade = CLICKER_UPGRADES.find((u) => u.id === upgradeId)
    if (!upgrade) continue

    const totalEffect = upgrade.effect * level

    if (upgradeId.startsWith('click-multiplier')) {
      clickMultiplier += totalEffect
    } else if (upgradeId.startsWith('combo-multiplier')) {
      comboMultiplier += totalEffect
    } else if (upgradeId.startsWith('auto-click')) {
      autoClickPerSec += totalEffect
    }
  }

  return { clickMultiplier, comboMultiplier, autoClickPerSec }
}

/**
 * Process a click and return euros earned.
 * Handles combo streaks with a 2-second timeout.
 */
export function processClick(
  state: ClickerState,
  now = Date.now(),
): { earned: number; newState: ClickerState } {
  const timeSinceLastClick = now - state.lastClickAt
  const comboTimeout = 2000 // 2 seconds

  // Reset combo if timeout exceeded
  const newCombo =
    timeSinceLastClick > comboTimeout ? 1 : Math.min(state.comboStreak + 1, 100)

  const { clickMultiplier, comboMultiplier } = calculateClickerMultipliers(
    state.boughtUpgrades,
  )

  // Base earn is multiplied by combo multiplier (1 + comboMultiplier effect * combo bonus)
  const comboBonus = newCombo > 1 ? 1 + (comboMultiplier - 1) * (newCombo - 1) : 1
  const earned = Math.round(clickMultiplier * comboBonus * 100) / 100

  return {
    earned,
    newState: {
      ...state,
      totalClicks: state.totalClicks + 1,
      comboStreak: newCombo,
      lastClickAt: now,
      clickerEarnings: state.clickerEarnings + earned,
    },
  }
}

/**
 * Claim auto-click earnings since last claim.
 * Auto-click happens continuously in the background.
 */
export function claimAutoClicks(state: ClickerState): number {
  const { autoClickPerSec } = calculateClickerMultipliers(state.boughtUpgrades)

  if (autoClickPerSec === 0) return 0

  // Return per-second rate. In practice, you'd track lastAutoClaimAt
  return autoClickPerSec
}

/** Get the cost of the next level of an upgrade. */
export function nextUpgradeCost(upgrade: ClickerUpgrade, currentLevel: number): number {
  if (upgrade.maxLevel && currentLevel >= upgrade.maxLevel) return Infinity
  return Math.round(upgrade.cost * Math.pow(1.15, currentLevel))
}
