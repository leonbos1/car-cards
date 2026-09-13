import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { QUIZ_CATEGORIES, type QuizCategory } from '../data/quiz'
import { formatCountdown, formatEuros } from '../game/economy'
import {
  QUESTIONS_PER_RUN,
  QUIZ_COOLDOWN_MS,
  buildRun,
  rewardFor,
  type QuizRun,
} from '../game/quiz'
import { useGame } from '../store/useGame'

export function Quiz() {
  // Subscribing to the timestamps is what re-renders the list after a run is
  // banked; readiness is then derived from them rather than from a snapshot.
  const quizPlayedAt = useGame((s) => s.quizPlayedAt)
  const finishQuiz = useGame((s) => s.finishQuiz)

  const waitFor = (categoryId: string) => {
    const last = quizPlayedAt[categoryId]
    if (last === undefined) return 0
    return Math.max(0, Math.min(QUIZ_COOLDOWN_MS, last + QUIZ_COOLDOWN_MS - Date.now()))
  }

  const [run, setRun] = useState<QuizRun | null>(null)
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [payout, setPayout] = useState<number | null>(null)

  function start(category: QuizCategory) {
    setRun(buildRun(category))
    setIndex(0)
    setPicked(null)
    setCorrect(0)
    setPayout(null)
  }

  function answer(choice: number) {
    if (picked !== null || !run) return
    setPicked(choice)
    if (choice === run.questions[index].answer) setCorrect((c) => c + 1)
  }

  function next() {
    if (!run) return
    if (index + 1 < run.questions.length) {
      setIndex(index + 1)
      setPicked(null)
      return
    }
    // Last question: bank the run. `correct` already counts this one, since it
    // was scored on the click that revealed the answer. The store re-checks the
    // cooldown and works out the money itself, so this cannot pay twice.
    setPayout(finishQuiz(run.category.id, correct))
  }

  if (payout !== null && run) {
    return (
      <Shell>
        <div className="rounded-2xl border border-gold-2/40 bg-gold-2/[0.07] p-6 text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-white/50">
            {run.category.name}
          </div>
          <div className="mt-2 text-4xl font-black tabular-nums">
            {correct} / {run.questions.length}
          </div>
          <div className="mt-3 text-2xl font-extrabold text-gold-2">{formatEuros(payout)}</div>
          <p className="mt-2 text-sm text-white/50">
            {correct === run.questions.length
              ? 'Perfect run.'
              : `Back tomorrow for another go at ${run.category.name.toLowerCase()}.`}
          </p>
          <button
            type="button"
            onClick={() => setRun(null)}
            className="mt-5 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-bold transition hover:bg-white/20"
          >
            Back to categories
          </button>
        </div>
      </Shell>
    )
  }

  if (run) {
    const question = run.questions[index]
    const answered = picked !== null
    return (
      <Shell>
        <div className="mb-4 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-white/40">
          <span>{run.category.name}</span>
          <span className="tabular-nums">
            {index + 1} / {run.questions.length}
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gold-2/70"
            initial={false}
            animate={{ width: `${((index + (answered ? 1 : 0)) / run.questions.length) * 100}%` }}
          />
        </div>

        <h3 className="mb-5 mt-5 text-xl font-extrabold leading-snug">{question.prompt}</h3>

        <div className="space-y-2">
          {question.options.map((option, i) => {
            const isAnswer = i === question.answer
            const isPicked = i === picked
            const tone = !answered
              ? 'border-white/10 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.08]'
              : isAnswer
                ? 'border-emerald-400/60 bg-emerald-400/10'
                : isPicked
                  ? 'border-red-400/60 bg-red-400/10'
                  : 'border-white/5 bg-white/[0.02] opacity-50'
            return (
              <button
                key={option}
                type="button"
                disabled={answered}
                onClick={() => answer(i)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${tone}`}
              >
                <span className="shrink-0 text-xs font-black text-white/35">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="min-w-0">{option}</span>
              </button>
            )
          })}
        </div>

        <AnimatePresence>
          {answered && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <p className="rounded-xl bg-white/5 p-3 text-sm text-white/60">{question.note}</p>
              <button
                type="button"
                onClick={next}
                className="mt-3 w-full rounded-xl bg-gold-2 py-3 text-sm font-extrabold text-black transition hover:brightness-110"
              >
                {index + 1 < run.questions.length ? 'Next question' : 'Collect winnings'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </Shell>
    )
  }

  return (
    <Shell>
      <h2 className="mb-1 text-2xl font-extrabold tracking-tight">Quiz</h2>
      <p className="mb-6 text-sm text-white/45">
        {QUESTIONS_PER_RUN} questions per round, paid per correct answer. One round per category
        each day.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {QUIZ_CATEGORIES.map((category) => {
          const waitMs = waitFor(category.id)
          const ready = waitMs <= 0
          return (
            <div
              key={category.id}
              className={`rounded-2xl border p-4 ${
                ready ? 'border-white/10 bg-white/[0.03]' : 'border-white/5 bg-white/[0.02] opacity-50'
              }`}
            >
              <h3 className="text-base font-extrabold">{category.name}</h3>
              <p className="mb-3 mt-0.5 text-xs text-white/45">{category.blurb}</p>
              <p className="mb-3 text-xs font-semibold text-white/60">
                {formatEuros(category.reward)} per correct answer
                <span className="text-white/35">
                  {' '}
                  · up to {formatEuros(rewardFor(category, QUESTIONS_PER_RUN))}
                </span>
              </p>
              <button
                type="button"
                disabled={!ready}
                onClick={() => start(category)}
                className="w-full rounded-xl bg-gold-2 py-2.5 text-sm font-extrabold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
              >
                {ready ? 'Play' : `Back in ${formatCountdown(waitMs)}`}
              </button>
            </div>
          )
        })}
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">{children}</div>
}
