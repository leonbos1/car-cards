import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatEuros, quickSellValue } from '../game/economy'
import type { CardView, Pack, Pull } from '../types'
import { CarCard, CLASS_COLORS, glowFor } from './CarCard'
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

  const [deep, mid, light] = CLASS_COLORS[pack.art]

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-[#04060b]"
      onClick={advance}
    >
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
            <motion.div
              className="relative h-[380px] w-[270px] rounded-2xl"
              style={{
                background: `linear-gradient(150deg, ${light} 0%, ${mid} 45%, ${deep} 100%)`,
                boxShadow: `0 0 90px ${mid}55, 0 24px 60px rgba(0,0,0,.6)`,
              }}
              animate={reduced ? undefined : { scale: [1, 1.035, 1] }}
              transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div
                className="absolute inset-0 rounded-2xl opacity-60"
                style={{
                  background:
                    'repeating-linear-gradient(115deg, rgba(255,255,255,.12) 0 14px, transparent 14px 34px)',
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                <span
                  className="text-2xl font-extrabold uppercase leading-tight"
                  style={{ color: pack.art === 'special' ? '#ffe6a3' : deep }}
                >
                  {pack.name}
                </span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: pack.art === 'special' ? '#ffd9f4' : deep, opacity: 0.75 }}
                >
                  {pack.tiers.length} cars
                </span>
              </div>
            </motion.div>
            <p className="mt-8 animate-pulse text-sm font-semibold uppercase tracking-[0.3em] text-white/50">
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
                  background: 'linear-gradient(150deg, #16203a 0%, #0a1020 100%)',
                  boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.08), 0 18px 40px rgba(0,0,0,.6)',
                }}
              >
                <div className="flex h-full items-center justify-center">
                  <span className="text-4xl font-black tracking-tighter text-white/10">CC</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {current.isNew && flipped && (
            <motion.span
              className="mt-5 rounded-full bg-gold-2 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-black"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              New
            </motion.span>
          )}

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-white/35">
            {flipped ? 'Tap for next' : 'Tap to reveal'} · {index + 1}/{pulls.length}
          </p>
        </div>
      )}

      {/* --------------------------------------------------------- summary */}
      {stage === 'summary' && (
        <motion.div
          className="flex h-full w-full flex-col px-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 text-center">
            <h2 className="text-2xl font-extrabold">{pack.name} opened</h2>
            <p className="text-sm text-white/45">
              {pulls.filter((p) => p.isNew).length} new · quick-sell value{' '}
              {formatEuros(totalValue)}
            </p>
          </div>

          <div className="flex flex-1 flex-wrap content-start justify-center gap-3 overflow-y-auto py-2">
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
                  <span className="absolute -right-1 -top-1 rounded-full bg-gold-2 px-1.5 py-0.5 text-[9px] font-extrabold text-black">
                    NEW
                  </span>
                )}
              </motion.div>
            ))}
          </div>

          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => onOpenAnother(pack)}
              disabled={!canAffordAnother}
              className="rounded-xl bg-gold-2 px-5 py-2.5 text-sm font-extrabold text-black disabled:bg-white/10 disabled:text-white/40"
            >
              Open another · {formatEuros(pack.price)}
            </button>
            <button
              type="button"
              onClick={onDone}
              className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-bold hover:bg-white/20"
            >
              Back to store
            </button>
          </div>
        </motion.div>
      )}

      {/* skip out of a long reveal */}
      {stage !== 'summary' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setStage('summary')
          }}
          className="absolute right-4 top-4 z-50 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70 hover:bg-white/20"
        >
          Skip
        </button>
      )}
    </div>
  )
}
