import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronsRight, RotateCcw, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatEuros, quickSellValue } from '../game/economy'
import type { CardView, Pack, Pull } from '../types'
import { CarCard, CLASS_COLORS, glowFor } from './CarCard'
import { PackFoil } from './PackStore'
import { Wordmark } from './shell/Chrome'
import { Walkout } from './Walkout'

type Stage = 'sealed' | 'tearing' | 'revealing' | 'summary'

/** A pull worth stopping the room for. */
function isWalkout(card: CardView): boolean {
  return card.cardClass === 'special' || (card.tier === 'gold' && card.rare)
}

interface Props {
  pack: Pack
  pulls: Pull[]
  onDone: () => void
  onOpenAnother: (pack: Pack) => void
  canAffordAnother: boolean
}

export function PackOpening({ pack, pulls, onDone, onOpenAnother, canAffordAnother }: Props) {
  const reduced = useReducedMotion() ?? false
  const [stage, setStage] = useState<Stage>('sealed')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const current = pulls[index]
  const walkout = current ? isWalkout(current.card) : false

  const totalValue = useMemo(
    () => pulls.reduce((sum, p) => sum + quickSellValue(p.card), 0),
    [pulls],
  )

  const tear = useCallback(() => {
    setStage('tearing')
    setTimeout(() => setStage('revealing'), reduced ? 120 : 900)
  }, [reduced])

  /** Flip the current card, or move to the next one if it is already flipped. */
  const advance = useCallback(() => {
    if (stage === 'sealed') return tear()
    if (stage !== 'revealing') return
    if (!flipped) return setFlipped(true)
    if (index + 1 < pulls.length) {
      setIndex((i) => i + 1)
      setFlipped(false)
    } else {
      setStage('summary')
    }
  }, [stage, flipped, index, pulls.length, tear])

  // Space and Enter drive the reveal too — clicking 30 times gets old.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        advance()
      }
      if (e.key === 'Escape' && stage === 'summary') onDone()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance, stage, onDone])

  const [, mid] = CLASS_COLORS[pack.art]
  const newCount = pulls.filter((p) => p.isNew).length

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-[#04060b]"
      style={{
        backgroundImage: `radial-gradient(ellipse 80% 55% at 50% 0%, #131b2e 0%, transparent 70%), radial-gradient(ellipse 70% 40% at 50% 100%, ${mid}14 0%, transparent 70%), repeating-linear-gradient(-55deg, transparent 0 22px, rgb(255 255 255 / 0.014) 22px 23px)`,
      }}
      onClick={advance}
    >
      {/* the floor the cards stand on */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background:
            'linear-gradient(180deg, transparent, rgb(0 0 0 / 0.5)), repeating-linear-gradient(90deg, transparent 0 60px, rgb(255 255 255 / 0.02) 60px 61px)',
        }}
      />
      {/* the glow that leaks the rarity a beat before the flip */}
      <AnimatePresence>
        {stage === 'revealing' && current && (
          <motion.div
            key={`glow-${index}`}
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            style={{
              background: `radial-gradient(circle at 50% 48%, ${glowFor(current.card)}3a 0%, transparent 58%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* walkout takeover, only once the card is face-up */}
      <AnimatePresence>
        {stage === 'revealing' && current && walkout && flipped && (
          <motion.div
            key={`walkout-${index}`}
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Walkout card={current.card} reduced={reduced} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* white flash on the tear */}
      <AnimatePresence>
        {stage === 'tearing' && (
          <motion.div
            className="pointer-events-none absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.9, times: [0, 0.35, 1] }}
          />
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------------- sealed */}
      <AnimatePresence mode="wait">
        {stage === 'sealed' && (
          <motion.div
            key="sealed"
            className="flex flex-col items-center"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.6, opacity: 0 }}
          >
            <p className="eyebrow mb-1">{pack.tiers.length} cars inside</p>
            <h2 className="headline mb-6 text-4xl">{pack.name}</h2>
            <motion.div
              className="relative h-[380px] w-[270px]"
              style={{
                filter: `drop-shadow(0 0 60px ${mid}66) drop-shadow(0 24px 30px rgba(0,0,0,.6))`,
              }}
              animate={reduced ? undefined : { scale: [1, 1.035, 1] }}
              transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
            >
              <PackFoil pack={pack} width={270} height={380} shine={!reduced} />
            </motion.div>
            <p className="mt-8 flex items-center gap-2 font-display text-sm font-extrabold uppercase italic tracking-[0.3em] text-gold-2 animate-pulse-soft">
              <ChevronsRight size={16} strokeWidth={3} />
              Tap to open
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------- revealing */}
      {stage === 'revealing' && current && (
        <div className="relative flex max-w-full flex-col items-center px-4">
          <motion.div
            key={`card-${index}`}
            className="relative"
            style={{ perspective: 1400 }}
            initial={reduced ? { opacity: 0 } : { x: 260, opacity: 0, rotateY: -95 }}
            animate={{ x: 0, opacity: 1, rotateY: 0 }}
            transition={{ type: 'spring', stiffness: 130, damping: 18 }}
          >
            <motion.div
              className="relative"
              style={{ transformStyle: 'preserve-3d' }}
              animate={{ rotateY: flipped ? 0 : 180 }}
              transition={{ duration: reduced ? 0.01 : 0.55, ease: 'easeInOut' }}
            >
              {/* face */}
              <motion.div
                style={{ backfaceVisibility: 'hidden' }}
                animate={
                  flipped && walkout && !reduced
                    ? { scale: [1, 1.12, 1.06] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.9, ease: 'easeOut' }}
              >
                <CarCard card={current.card} animateStats={flipped} />
              </motion.div>

              {/* back */}
              <div
                className="absolute inset-0 rounded-[18px]"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  background: `radial-gradient(ellipse 80% 55% at 50% 50%, ${mid}26 0%, transparent 70%), repeating-linear-gradient(-55deg, transparent 0 16px, rgba(232,194,90,.05) 16px 18px), linear-gradient(150deg, #16203a 0%, #0a1020 100%)`,
                  boxShadow: 'inset 0 0 0 2px rgba(232,194,90,.28), inset 0 0 0 8px rgba(0,0,0,.35), inset 0 0 0 9px rgba(255,255,255,.06), 0 18px 40px rgba(0,0,0,.6)',
                }}
              >
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <Wordmark className="text-[34px] opacity-90" />
                  <span className="eyebrow">Collector series</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {current.isNew && flipped && (
            <motion.span
              className="tag mt-5 gap-1 px-3 py-1 text-xs shadow-[0_0_20px_rgb(232_194_90/0.5)]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Sparkles size={12} strokeWidth={3} />
              New
            </motion.span>
          )}

          <p className="mt-6 flex items-center gap-2 font-display text-sm font-bold uppercase italic tracking-[0.25em] text-white/45">
            {flipped ? 'Tap for next' : 'Tap to reveal'}
            <span className="text-white/20">/</span>
            <span className="num not-italic tracking-normal text-white/70">
              {index + 1}
              <span className="text-white/35">/{pulls.length}</span>
            </span>
          </p>
        </div>
      )}

      {/* --------------------------------------------------------- summary */}
      {stage === 'summary' && (
        <motion.div
          className="relative flex h-full w-full flex-col pt-[max(1.25rem,env(safe-area-inset-top))]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto w-full max-w-5xl px-4 text-center">
            <p className="eyebrow">Pack opened</p>
            <h2 className="headline mt-1 text-3xl sm:text-4xl">{pack.name} opened</h2>
            <div className="mt-3 flex justify-center gap-2">
              <span className="panel flex items-baseline gap-2 px-3 py-1.5">
                <span className="num text-xl leading-none text-gold-2">{newCount}</span>
                <span className="eyebrow">new</span>
              </span>
              <span className="panel flex items-baseline gap-2 px-3 py-1.5">
                <span className="eyebrow">quick-sell value</span>
                <span className="num text-xl leading-none">{formatEuros(totalValue)}</span>
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-1 flex-wrap content-start justify-center gap-3 overflow-y-auto px-4 py-3 sm:[align-content:safe_center]">
            {pulls.map((pull, i) => (
              <motion.div
                key={`${pull.card.id}-${i}`}
                className="relative"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.025, 0.5) }}
              >
                <CarCard card={pull.card} scale={0.42} />
                {pull.isNew && (
                  <span className="tag absolute -right-1.5 -top-1.5 px-1.5 text-[10px] shadow-[0_0_12px_rgb(232_194_90/0.5)]">
                    New
                  </span>
                )}
              </motion.div>
            ))}
          </div>

          <div className="border-t border-white/[0.08] bg-[#070a11]/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
            <div className="mx-auto flex max-w-md flex-col gap-2 sm:max-w-none sm:flex-row sm:justify-center sm:gap-3">
              <button
                type="button"
                onClick={() => onOpenAnother(pack)}
                disabled={!canAffordAnother}
                className="btn btn-primary w-full sm:w-auto"
              >
                <RotateCcw size={17} strokeWidth={2.8} />
                Open another · <span className="num">{formatEuros(pack.price)}</span>
              </button>
              <button
                type="button"
                onClick={onDone}
                className={`btn w-full sm:w-auto ${canAffordAnother ? 'btn-secondary' : 'btn-primary'}`}
              >
                Back to store
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* skip out of a long reveal */}
      {stage !== 'summary' && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-start gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1 pt-1">
            <p className="eyebrow truncate">{pack.name}</p>
            {/* one segment per card, filled as they are turned */}
            <div aria-hidden className="mt-2 flex max-w-sm gap-[3px]">
              {pulls.map((pull, i) => {
                const seen = stage === 'revealing' && (i < index || (i === index && flipped))
                return (
                  <span
                    key={i}
                    className="h-1 min-w-0 flex-1 transition-colors duration-300"
                    style={{
                      background: seen ? glowFor(pull.card) : i === index && stage === 'revealing' ? 'rgb(255 255 255 / 0.45)' : 'rgb(255 255 255 / 0.12)',
                      clipPath: 'polygon(2px 0, 100% 0, calc(100% - 2px) 100%, 0 100%)',
                    }}
                  />
                )
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setStage('summary')
            }}
            className="btn btn-secondary btn-sm pointer-events-auto shrink-0"
          >
            Skip
            <ChevronsRight size={15} strokeWidth={3} />
          </button>
        </div>
      )}
    </div>
  )
}
