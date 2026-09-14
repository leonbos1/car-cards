import { describe, expect, it } from 'vitest'
import { QUIZ_CATEGORIES } from '../data/quiz'
import { bookValue } from './economy'
import { ALL_CARDS } from './pack'
import { MAX_DAILY_QUIZ_REWARD, QUESTIONS_PER_RUN, buildRun, rewardFor } from './quiz'

function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

const ALL_QUESTIONS = QUIZ_CATEGORIES.flatMap((c) => c.questions)

describe('quiz questions', () => {
  it('covers the four categories asked for', () => {
    expect(QUIZ_CATEGORIES.map((c) => c.id).sort()).toEqual([
      'alfa',
      'general',
      'mechanic',
      'racing',
    ])
  })

  it('has no duplicate ids', () => {
    expect(new Set(ALL_QUESTIONS.map((q) => q.id)).size).toBe(ALL_QUESTIONS.length)
  })

  it('points every answer at a real option', () => {
    // An answer index outside the options would pay out for a click that can
    // never be right, or refuse to pay for one that is.
    for (const q of ALL_QUESTIONS) {
      expect(q.answer, q.id).toBeGreaterThanOrEqual(0)
      expect(q.answer, q.id).toBeLessThan(q.options.length)
    }
  })

  it('offers four distinct options and one explanation each', () => {
    for (const q of ALL_QUESTIONS) {
      expect(q.options.length, q.id).toBe(4)
      expect(new Set(q.options).size, `${q.id} repeats an option`).toBe(4)
      for (const option of q.options) expect(option.trim(), q.id).not.toBe('')
      expect(q.note.trim(), `${q.id} has no explanation`).not.toBe('')
      // Either a question or a sentence the options complete — not a fragment
      // left hanging by an editing slip.
      const prompt = q.prompt.trim()
      expect(
        prompt.endsWith('?') || prompt.endsWith('…'),
        `${q.id} reads as neither a question nor a fill-in-the-blank`,
      ).toBe(true)
    }
  })

  it('has enough questions per category to keep runs varied', () => {
    for (const category of QUIZ_CATEGORIES) {
      expect(category.questions.length, category.id).toBeGreaterThanOrEqual(QUESTIONS_PER_RUN * 3)
    }
  })
})

describe('quiz runs', () => {
  it('asks the right number of questions, never repeating one', () => {
    for (const category of QUIZ_CATEGORIES) {
      for (let seed = 0; seed < 300; seed++) {
        const run = buildRun(category, seeded(seed))
        expect(run.questions.length).toBe(QUESTIONS_PER_RUN)
        expect(new Set(run.questions.map((q) => q.id)).size).toBe(QUESTIONS_PER_RUN)
        for (const q of run.questions) expect(category.questions).toContain(q)
      }
    }
  })

  it('eventually draws on the whole bank', () => {
    // A shuffle that always favoured the same few questions would make the
    // quiz repetitive and easy to memorise.
    for (const category of QUIZ_CATEGORIES) {
      const seen = new Set<string>()
      for (let seed = 0; seed < 500; seed++) {
        for (const q of buildRun(category, seeded(seed)).questions) seen.add(q.id)
      }
      expect(seen.size, category.id).toBe(category.questions.length)
    }
  })
})

describe('quiz payouts', () => {
  it('pays per correct answer and nothing for none', () => {
    for (const category of QUIZ_CATEGORIES) {
      expect(rewardFor(category, 0)).toBe(0)
      expect(rewardFor(category, -3)).toBe(0)
      expect(rewardFor(category, QUESTIONS_PER_RUN)).toBe(category.reward * QUESTIONS_PER_RUN)
      for (let i = 1; i <= QUESTIONS_PER_RUN; i++) {
        expect(rewardFor(category, i)).toBeGreaterThan(rewardFor(category, i - 1))
      }
    }
  })

  it('cannot buy a hypercar in a day', () => {
    // The quiz is a faucet on a 24h clock. It should make real progress feel
    // possible without letting a player answer their way to the best car in the
    // game in an afternoon. Since no pack reaches the top any more, the thing
    // worth measuring against is what a top car costs on the market.
    const best = ALL_CARDS.filter((c) => !c.special).reduce((a, b) =>
      bookValue(b) > bookValue(a) ? b : a,
    )
    // Measured in days rather than as a fraction: a fraction of the top car's
    // price stops meaning anything the moment that price moves, which is how
    // this assertion nearly stopped guarding anything.
    const daysOfPerfectQuizzing = bookValue(best) / MAX_DAILY_QUIZ_REWARD
    expect(daysOfPerfectQuizzing).toBeGreaterThan(20)
  })
})
