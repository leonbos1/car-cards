import { QUIZ_CATEGORIES, type QuizCategory, type QuizQuestion } from '../data/quiz'

/** Questions asked in one run. */
export const QUESTIONS_PER_RUN = 5

/**
 * One run per category per day.
 *
 * The quiz is a faucet, so like the daily pack it has to be on a clock. Without
 * this you could sit and answer the same eighteen questions until you could
 * afford a Hypercar Pack, and the economy would mean nothing.
 */
export const QUIZ_COOLDOWN_MS = 24 * 60 * 60 * 1000

export type Rng = () => number

/** The most a perfect run of every category can pay in one day. */
export const MAX_DAILY_QUIZ_REWARD = QUIZ_CATEGORIES.reduce(
  (sum, c) => sum + c.reward * QUESTIONS_PER_RUN,
  0,
)

export interface QuizRun {
  category: QuizCategory
  questions: QuizQuestion[]
}

/** Draw a run's worth of distinct questions, in a random order. */
export function buildRun(category: QuizCategory, rng: Rng = Math.random): QuizRun {
  const pool = [...category.questions]
  // Fisher-Yates, so every question has an equal chance of being asked.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return { category, questions: pool.slice(0, QUESTIONS_PER_RUN) }
}

export function rewardFor(category: QuizCategory, correct: number): number {
  return Math.max(0, correct) * category.reward
}
