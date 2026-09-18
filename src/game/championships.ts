/**
 * Seasonal racing championships. Compete in any race and earn championship
 * points. Top 10 finishers in the month get cumulative bonuses each week.
 */

export interface ChampionshipSeason {
  id: string
  /** Month as YYYY-MM. */
  period: string
  points: number
  /** Weekly payouts earned (weeks 1-4). */
  weeklyPayouts: number[]
}

/** Current season deterministic ID based on time. */
export function currentSeasonId(now = Date.now()): string {
  const date = new Date(now)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** Week of the month (1-4). */
export function currentWeek(now = Date.now()): number {
  const date = new Date(now)
  const day = date.getDate()
  return Math.floor((day - 1) / 7) + 1
}

/**
 * Award points for a race finish. First place = 10pts, 2nd = 9pts, etc.
 * Points decay if position > 10.
 */
export function awardPoints(finishPosition: number): number {
  if (finishPosition <= 10) return Math.max(1, 11 - finishPosition)
  return Math.max(1, Math.floor(11 - finishPosition / 2))
}

/**
 * Weekly bonus payout for finishing in top 10.
 * This is a ceiling; not every player will hit top 10.
 */
export function weeklyBonus(finishPoints: number): number {
  // Scale: 100pts/week baseline = €500 bonus
  return Math.max(0, Math.floor((finishPoints / 100) * 500))
}
