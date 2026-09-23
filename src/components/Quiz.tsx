import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  Brain,
  Check,
  Clock,
  Flag,
  Play,
  Shield,
  Trophy,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
import { PageHeader } from './ui/PageHeader'

/** A glyph per category, for the tiles. Unknown categories fall back to a brain. */
const CATEGORY_ICON: Record<string, LucideIcon> = {
  general: Brain,
  alfa: Shield,
  racing: Flag,
  mechanic: Wrench,
}

const SLANT = 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)'

export function Quiz() {
  // Subscribing to the timestamps is what re-renders the list after a run is
  // banked; readiness is then derived from them rather than from a snapshot.
  const quizPlayedAt = useGame((s) => s.quizPlayedAt)
  const finishQuiz = useGame((s) => s.finishQuiz)
  const reduceMotion = useReducedMotion()

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
  // Right/wrong per answered question, only to colour the progress segments.
  const [history, setHistory] = useState<boolean[]>([])

  // Re-render the category list now and then so the cooldown countdowns tick
  // down on screen. Display only: readiness is still derived from the store.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (run) return
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [run])

  // On a phone the answer note and the Next button land below the fold, behind
  // the tab bar; bring them up once an answer is in.
  const nextRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (picked === null) return
    nextRef.current?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [picked, reduceMotion])

  function start(category: QuizCategory) {
    setRun(buildRun(category))
    setIndex(0)
    setPicked(null)
    setCorrect(0)
    setPayout(null)
    setHistory([])
  }

  function answer(choice: number) {
    if (picked !== null || !run) return
    setPicked(choice)
    const right = choice === run.questions[index].answer
    setHistory((h) => [...h, right])
    if (right) setCorrect((c) => c + 1)
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
    const perfect = correct === run.questions.length
    const Icon = CATEGORY_ICON[run.category.id] ?? Brain
    return (
      <div className="mx-auto max-w-xl">
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="panel-cut relative overflow-hidden px-5 pb-6 pt-7 text-center sm:px-8"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-2/20 blur-3xl"
          />
          <div className="relative">
            <div className="eyebrow flex items-center justify-center gap-1.5">
              <Icon size={14} strokeWidth={2.4} />
              {run.category.name}
            </div>
            <h2 className="headline mt-2 text-4xl sm:text-5xl">{perfect ? 'Perfect run' : 'Round complete'}</h2>

            <div className="mt-5 flex justify-center gap-1.5" aria-hidden>
              {history.map((right, i) => (
                <span
                  key={i}
                  className={`grid size-8 place-items-center ${right ? 'bg-go/20 text-go' : 'bg-signal/15 text-signal'}`}
                  style={{ clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)' }}
                >
                  {right ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
                </span>
              ))}
            </div>

            <div className="mt-4">
              <div className="eyebrow">Score</div>
              <div className="num text-5xl leading-none">
                {correct}
                <span className="text-white/35"> / {run.questions.length}</span>
              </div>
            </div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.6, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={reduceMotion ? undefined : { delay: 0.3, type: 'spring', stiffness: 320, damping: 16 }}
              className="mx-auto mt-6 inline-flex flex-col items-center border border-gold-2/45 bg-gold-2/[0.1] px-6 py-3 shadow-[0_0_32px_-6px_rgb(232_194_90/0.6)]"
            >
              <span className="eyebrow flex items-center gap-1.5 text-gold-2/80">
                <Trophy size={13} strokeWidth={2.6} /> Winnings
              </span>
              <span className="num mt-1 text-4xl leading-none text-gold-2 [text-shadow:0_0_24px_rgb(232_194_90/0.5)] sm:text-5xl">
                +{formatEuros(payout)}
              </span>
            </motion.div>

            <p className="mt-4 text-sm text-white/55">
              {perfect
                ? 'Perfect run.'
                : `Back in ${QUIZ_COOLDOWN_MS / 3_600_000} hours for another go at ${run.category.name.toLowerCase()}.`}
            </p>
            <button type="button" onClick={() => setRun(null)} className="btn btn-primary btn-lg mt-6 w-full">
              Back to categories
            </button>
          </div>
        </motion.section>
      </div>
    )
  }

  if (run) {
    const question = run.questions[index]
    const answered = picked !== null
    const gotIt = answered && picked === question.answer
    const isLast = index + 1 >= run.questions.length
    return (
      <div className="mx-auto max-w-2xl">
        {/* HUD: category, question number, score so far. */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="eyebrow truncate">{run.category.name}</span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="flex items-center gap-1 text-sm text-white/55">
              <Check size={15} strokeWidth={3} className="text-go" />
              <span className="num text-base text-white">{correct}</span>
            </span>
            <span className="num text-base text-white/55">
              <span className="text-white">{index + 1}</span> / {run.questions.length}
            </span>
          </span>
        </div>

        <div
          className="mb-5 flex gap-1.5"
          role="progressbar"
          aria-label="Question"
          aria-valuemin={1}
          aria-valuemax={run.questions.length}
          aria-valuenow={index + 1}
        >
          {run.questions.map((q, i) => {
            const done = history[i]
            const tone =
              done === true
                ? 'bg-go shadow-[0_0_10px_rgb(67_224_138/0.55)]'
                : done === false
                  ? 'bg-signal shadow-[0_0_10px_rgb(255_77_61/0.5)]'
                  : i === index
                    ? 'animate-pulse-soft bg-gold-2'
                    : 'bg-white/10'
            return <span key={q.id} className={`h-1.5 flex-1 transition-colors ${tone}`} style={{ clipPath: SLANT }} />
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={question.id}
            initial={reduceMotion ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
          >
            <section className="panel-cut relative mb-4 overflow-hidden px-5 py-6 sm:px-7 sm:py-8">
              <div
                aria-hidden
                className="pointer-events-none absolute -left-10 -top-16 size-48 rounded-full bg-gold-2/[0.08] blur-3xl"
              />
              <p className="eyebrow relative text-gold-2/80">Question {index + 1}</p>
              <h3 className="relative mt-2 font-display text-2xl font-bold leading-tight text-white sm:text-3xl">
                {question.prompt}
              </h3>
            </section>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {question.options.map((option, i) => {
                const isAnswer = i === question.answer
                const isPicked = i === picked
                const state = !answered ? 'open' : isAnswer ? 'right' : isPicked ? 'wrong' : 'out'
                const tone = {
                  open: 'border-white/12 bg-gradient-to-b from-asphalt-3 to-asphalt-2 hover:border-gold-2/55 active:scale-[0.99]',
                  right: 'border-go/70 bg-go/[0.14] shadow-[0_0_22px_-4px_rgb(67_224_138/0.55)]',
                  wrong: 'border-signal/70 bg-signal/[0.13]',
                  out: 'border-white/[0.05] bg-white/[0.02] opacity-45',
                }[state]
                const letterTone = {
                  open: 'bg-gold-2 text-[#1a1204]',
                  right: 'bg-go text-[#04210f]',
                  wrong: 'bg-signal text-white',
                  out: 'bg-white/10 text-white/50',
                }[state]
                return (
                  <motion.button
                    key={option}
                    type="button"
                    disabled={answered}
                    onClick={() => answer(i)}
                    animate={
                      reduceMotion || !isPicked
                        ? undefined
                        : state === 'wrong'
                          ? { x: [0, -7, 7, -4, 4, 0] }
                          : { scale: [1, 1.03, 1] }
                    }
                    transition={{ duration: 0.35 }}
                    className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border py-2.5 pl-2.5 pr-4 text-left transition-colors disabled:cursor-default ${tone}`}
                  >
                    <span
                      className={`num grid h-9 w-10 shrink-0 place-items-center text-lg italic ${letterTone}`}
                      style={{ clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)' }}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="min-w-0 flex-1 text-base font-semibold leading-snug">{option}</span>
                    {state === 'right' && <Check size={20} strokeWidth={3} className="shrink-0 text-go" />}
                    {state === 'wrong' && <X size={20} strokeWidth={3} className="shrink-0 text-signal" />}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {answered && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
              aria-live="polite"
            >
              <div
                className={`rounded-xl border-l-4 p-3.5 ${
                  gotIt ? 'border-go bg-go/[0.08]' : 'border-signal bg-signal/[0.08]'
                }`}
              >
                <p className={`headline text-2xl ${gotIt ? 'text-go' : 'text-signal'}`}>
                  {gotIt ? 'Correct' : 'Wrong'}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-white/70">{question.note}</p>
              </div>
              <button
                ref={nextRef}
                type="button"
                onClick={next}
                className="btn btn-primary btn-lg mt-3 w-full scroll-mb-28 lg:scroll-mb-8"
              >
                {isLast ? (
                  <>
                    <Trophy size={19} strokeWidth={2.6} /> Collect winnings
                  </>
                ) : (
                  <>
                    Next question <ArrowRight size={19} strokeWidth={2.6} />
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const readyCount = QUIZ_CATEGORIES.filter((c) => waitFor(c.id) <= 0).length

  return (
    <div>
      <PageHeader
        eyebrow="Trivia"
        title="Quiz"
        subtitle={`${QUESTIONS_PER_RUN} questions per round, paid per correct answer. One round per category every ${QUIZ_COOLDOWN_MS / 3_600_000} hours.`}
        right={
          <div className="text-right">
            <div className="eyebrow">Ready</div>
            <div className="num text-2xl leading-none">
              <span className={readyCount > 0 ? 'text-gold-2' : ''}>{readyCount}</span>
              <span className="text-white/35">/{QUIZ_CATEGORIES.length}</span>
            </div>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {QUIZ_CATEGORIES.map((category) => {
          const waitMs = waitFor(category.id)
          const ready = waitMs <= 0
          const Icon = CATEGORY_ICON[category.id] ?? Brain
          const progress = ready ? 1 : 1 - waitMs / QUIZ_COOLDOWN_MS
          return (
            <button
              key={category.id}
              type="button"
              disabled={!ready}
              onClick={() => start(category)}
              aria-label={ready ? `Play ${category.name}` : `${category.name}, back in ${formatCountdown(waitMs)}`}
              className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition ${
                ready
                  ? 'border-gold-2/35 bg-gradient-to-br from-asphalt-3 via-asphalt-2 to-asphalt shadow-[0_0_26px_-10px_rgb(232_194_90/0.6)] hover:border-gold-2/70 active:scale-[0.99]'
                  : 'cursor-not-allowed border-white/[0.06] bg-asphalt/80'
              }`}
            >
              <div className="flex items-start gap-3.5 p-4">
                <span
                  className={`grid size-12 shrink-0 place-items-center rounded-lg ${
                    ready
                      ? 'bg-gradient-to-b from-[#ffe08a] to-[#b8871f] text-[#2a1c02] shadow-[0_0_16px_rgb(232_194_90/0.4)]'
                      : 'bg-white/[0.05] text-white/35'
                  }`}
                >
                  <Icon size={24} strokeWidth={2.3} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className={`headline text-2xl ${ready ? '' : 'text-white/55'}`}>{category.name}</h3>
                  <p className={`mt-1 text-sm ${ready ? 'text-white/55' : 'text-white/35'}`}>{category.blurb}</p>
                  <p className={`mt-2 text-sm ${ready ? 'text-white/70' : 'text-white/40'}`}>
                    <span className={`num text-base ${ready ? 'text-gold-2' : ''}`}>{formatEuros(category.reward)}</span>{' '}
                    per correct answer
                    <span className="text-white/35">
                      {' '}
                      · up to {formatEuros(rewardFor(category, QUESTIONS_PER_RUN))}
                    </span>
                  </p>
                </div>
              </div>

              {/* Footer strip: the call to play, or the cooldown. */}
              {ready ? (
                <span className="mt-auto flex min-h-12 items-center justify-between bg-gradient-to-b from-[#ffe08a] via-gold-2 to-[#c99a2e] px-4 font-display text-lg font-extrabold uppercase italic tracking-wide text-[#1a1204] shadow-[inset_0_1px_0_rgb(255_255_255/0.55)]">
                  <span className="flex items-center gap-2">
                    <Play size={17} strokeWidth={3} fill="currentColor" /> Play
                  </span>
                  <span className="text-sm opacity-70">{QUESTIONS_PER_RUN} questions</span>
                </span>
              ) : (
                <span className="mt-auto block border-t border-white/[0.06] bg-black/30">
                  <span className="flex min-h-12 items-center justify-between px-4">
                    <span className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-white/50">
                      <Clock size={16} strokeWidth={2.4} /> Back in
                    </span>
                    <span className="num text-xl text-white/75">{formatCountdown(waitMs)}</span>
                  </span>
                  <span className="block h-1 bg-white/[0.05]">
                    <span className="block h-full bg-white/25" style={{ width: `${progress * 100}%` }} />
                  </span>
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
