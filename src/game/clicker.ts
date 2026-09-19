/** Base money earned per click. */
const BASE_CLICK_VALUE = 0.05

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
    description: '+25% per click',
    cost: 15,
    effect: 0.25,
  },
  {
    id: 'click-multiplier-2',
    name: 'Professional Driver',
    description: '+50% per click',
    cost: 150,
    effect: 0.5,
  },
  {
    id: 'auto-click-1',
    name: 'Power Steering',
    description: 'Earn €0.005 per second',
    cost: 300,
    effect: 0.005,
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
 * Returns {clickMultiplier, autoClickPerSec}
 */
export function calculateClickerMultipliers(boughtUpgrades: Record<string, number>) {
  let clickMultiplier = BASE_CLICK_VALUE
  let autoClickPerSec = 0

  for (const [upgradeId, level] of Object.entries(boughtUpgrades)) {
    const upgrade = CLICKER_UPGRADES.find((u) => u.id === upgradeId)
    if (!upgrade) continue

    const totalEffect = upgrade.effect * level

    if (upgradeId.startsWith('click-multiplier')) {
      clickMultiplier += totalEffect
    } else if (upgradeId.startsWith('auto-click')) {
      autoClickPerSec += totalEffect
    }
  }

  return { clickMultiplier, autoClickPerSec }
}

/**
 * Process a click and return euros earned.
 * Handles combo streaks with a 2-second timeout. Combo bonus is 1% per combo level.
 */
export function processClick(
  state: ClickerState,
  now = Date.now(),
): { earned: number; newState: ClickerState } {
  const timeSinceLastClick = now - state.lastClickAt
  const comboTimeout = 2000 // 2 seconds

  // Reset combo if timeout exceeded
  const newCombo =
    timeSinceLastClick > comboTimeout ? 1 : Math.min(state.comboStreak + 1, 50)

  const { clickMultiplier } = calculateClickerMultipliers(state.boughtUpgrades)

  // Combo gives 1% bonus per level (so 50 combo = 50% bonus max)
  const comboBonus = 1 + (newCombo - 1) * 0.01
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
