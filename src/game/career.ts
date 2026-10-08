export interface CareerInput {
  racesRun: number
  racesWon: number
  /** Season id -> titles won. */
  seasonTitles: Record<string, number>
  /** Objective ids already paid out. */
  claimedObjectives: string[]
}

export interface CareerStats {
  racesRun: number
  racesWon: number
  /** Whole-number percent of races won, or 0 when no races have been run. */
  winRate: number
  /** Titles won across every season. */
  seasonTitles: number
  objectivesClaimed: number
}

/**
 * The career figures that the Game Statistics block above does not already
 * show: cars and packs are there, so they are not repeated here.
 */
export function careerStats(state: CareerInput): CareerStats {
  const seasonTitles = Object.values(state.seasonTitles).reduce((sum, n) => sum + n, 0)
  return {
    racesRun: state.racesRun,
    racesWon: state.racesWon,
    // Multiplying before dividing keeps an exact half, such as 57 of 200, from
    // being computed as 28.499... and rounding down.
    winRate: state.racesRun > 0 ? Math.round((state.racesWon * 100) / state.racesRun) : 0,
    seasonTitles,
    objectivesClaimed: state.claimedObjectives.length,
  }
}
