import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Coins, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import IMAGES from '../data/car-images.json'
import { formatEuros, quickSellValue } from '../game/economy'
import { deriveOffroadSpecs } from '../game/offroad'
import type { CardView } from '../types'
import { CarCard, CLASS_COLORS, glowFor } from './CarCard'

const images = IMAGES as Record<
  string,
  { file: string; artist: string; license: string; sourceUrl: string }
>

interface Props {
  card: CardView | null
  owned: number
  onClose: () => void
  onSell?: (carId: string) => void
}

/** True from the `sm` breakpoint up, where the card sits beside its sheet. */
function useWide(): boolean {
  const query = '(min-width: 640px)'
  const [wide, setWide] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )
  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setWide(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return wide
}

export function CardDetail({ card, owned, onClose, onSell }: Props) {
  const offroad = card ? deriveOffroadSpecs(card) : null
  const reduceMotion = useReducedMotion()
  const wide = useWide()

  // Escape closes, as it does for every overlay.
  useEffect(() => {
    if (!card) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [card, onClose])

  const glow = card ? glowFor(card) : '#e8c25a'
  const [, mid] = card ? CLASS_COLORS[card.cardClass] : ['', '#e8c25a']
  const accent = card?.cardClass === 'special' ? '#c9a227' : mid
  const grade = card
    ? `${card.special ? card.special.label : card.rare ? 'Rare' : 'Common'} ${card.tier}`
    : ''

  return (
    <AnimatePresence>
      {card && offroad && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`${card.make} ${card.model}`}
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Backdrop: the screen dims to black, a floodlight in the card's
              tier colour comes up behind it, and faint speed lines cross it. */}
          <div aria-hidden className="pointer-events-none fixed inset-0 bg-pitch/90 backdrop-blur-md" />
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0"
            style={{
              background: `radial-gradient(ellipse 60% 45% at ${wide ? '30%' : '50%'} 30%, ${glow}40 0%, transparent 70%)`,
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0"
            style={{
              background:
                'repeating-linear-gradient(-60deg, transparent 0 38px, rgb(255 255 255 / 0.025) 38px 39px)',
            }}
          />

          {/* Always in reach, however far the sheet is scrolled. */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            autoFocus
            className="fixed right-3 top-3 z-10 grid size-12 place-items-center rounded-full border border-white/15 bg-black/60 text-white/80 shadow-[0_4px_18px_rgb(0_0_0/0.5)] backdrop-blur transition hover:border-gold-2/60 hover:text-gold-2 sm:right-5 sm:top-5"
          >
            <X size={22} strokeWidth={2.6} />
          </button>

          <div className="relative flex min-h-full items-start justify-center px-4 pb-10 pt-16 sm:items-center sm:px-6 sm:py-16">
            <motion.div
              className="flex w-full max-w-4xl flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10"
              initial={reduceMotion ? false : { y: 24 }}
              animate={{ y: 0 }}
              exit={reduceMotion ? undefined : { y: 18 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            >
              {/* The card, as the hero. */}
              <motion.div
                className="relative shrink-0"
                style={{ perspective: 900 }}
                initial={reduceMotion ? false : { rotateY: -18, scale: 0.86, opacity: 0 }}
                animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.04 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  aria-hidden
                  className="absolute -inset-12 rounded-full blur-2xl"
                  style={{ background: `radial-gradient(circle, ${glow}80 0%, ${glow}22 45%, transparent 70%)` }}
                />
                <CarCard card={card} scale={wide ? 1.08 : 0.8} className="relative" />
                <div
                  aria-hidden
                  className="mx-auto mt-3 h-3 w-3/4 rounded-[50%] bg-black/70 blur-md"
                />
              </motion.div>

              {/* The stat sheet. */}
              <div
                className="panel-cut relative w-full min-w-0 max-w-md flex-1 p-5 sm:max-w-none sm:p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[3px]"
                  style={{ background: `linear-gradient(90deg, ${accent}, transparent 80%)` }}
                />

                <p className="eyebrow mb-1" style={{ color: accent }}>
                  {card.make}
                </p>
                <h3 className="headline text-4xl sm:text-5xl">{card.model}</h3>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/60">
                  <span
                    className="tag"
                    style={{
                      background: accent,
                      color: card.cardClass === 'special' ? '#1a1204' : '#0b0f17',
                    }}
                  >
                    {grade}
                  </span>
                  <span>
                    Rated <span className="num text-base text-white">{card.overall}</span>
                  </span>
                  <span className="text-white/25" aria-hidden>
                    /
                  </span>
                  <span className="num text-base text-white/80">{card.year}</span>
                  <span className="text-white/25" aria-hidden>
                    /
                  </span>
                  <span className="font-display font-bold uppercase tracking-wider text-white/80">
                    {card.country}
                  </span>
                </div>

                <SectionLabel>Performance</SectionLabel>
                <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-white/[0.07]">
                  <Stat label="Power" value={card.specs.hp} unit="hp" />
                  <Stat label="0–100 km/h" value={card.specs.zeroToHundred.toFixed(1)} unit="s" />
                  <Stat label="Top speed" value={card.specs.topSpeed} unit="km/h" />
                  <Stat label="Weight" value={card.specs.weightKg} unit="kg" />
                  {card.special?.limitedTo && (
                    <Stat label="Units built" value={card.special.limitedTo.toLocaleString('nl-NL')} />
                  )}
                  {/* Five cells leave a hole in a two-column sheet; the last one closes it. */}
                  <Stat
                    label="Owned"
                    value={owned}
                    unit="×"
                    highlight={owned > 0}
                    full={!card.special?.limitedTo}
                  />
                </dl>

                <SectionLabel>Chassis</SectionLabel>
                <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-white/[0.07] sm:grid-cols-3">
                  <Stat label="Drivetrain" value={offroad.driveTrain} small />
                  <Stat label="Ground clearance" value={offroad.groundClearanceMm} unit="mm" small />
                  <Stat label="Tyres" value={offroad.tyreSize} small wide />
                </dl>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-black/25 px-3.5 py-3">
                  <p className="flex items-center gap-2.5">
                    <Coins size={18} strokeWidth={2.2} aria-hidden className="text-gold-2" />
                    <span className="eyebrow">Quick-sell</span>
                    <span className="num text-xl leading-none text-gold-2">
                      {formatEuros(quickSellValue(card))}
                    </span>
                  </p>
                  {onSell && owned > 1 && (
                    <button
                      type="button"
                      onClick={() => onSell(card.id)}
                      className="btn btn-secondary btn-sm grow sm:grow-0"
                    >
                      Sell one duplicate
                    </button>
                  )}
                </div>

                <Credit id={card.id} />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="eyebrow mb-2 mt-6 flex items-center gap-3">
      {children}
      <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
    </p>
  )
}

/** One cell of the stat sheet: label over a big timing-screen number. */
function Stat({
  label,
  value,
  unit,
  small = false,
  wide = false,
  highlight = false,
  full = false,
}: {
  label: string
  value: string | number
  unit?: string
  small?: boolean
  /** Spans both columns on a phone, where a tyre size will not fit half-width. */
  wide?: boolean
  highlight?: boolean
  /** Spans the whole row at every width. */
  full?: boolean
}) {
  return (
    <div className={`bg-asphalt px-3.5 py-3 ${full ? 'col-span-full' : wide ? 'col-span-2 sm:col-span-1' : ''}`}>
      <dt className="eyebrow leading-tight">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-1">
        <span
          className={`num leading-none ${small ? 'text-xl' : 'text-3xl'} ${highlight ? 'text-gold-2' : 'text-white'}`}
        >
          {value}
        </span>
        {unit && (
          <span className="font-display text-sm font-bold uppercase text-white/45">{unit}</span>
        )}
      </dd>
    </div>
  )
}

/** CC BY and CC BY-SA both require the photographer to be credited. */
function Credit({ id }: { id: string }) {
  const image = images[id]
  if (!image) return null
  return (
    <p className="mt-5 border-t border-white/[0.07] pt-3 text-xs leading-relaxed text-white/40">
      Photo: {image.artist} · {image.license} ·{' '}
      {image.sourceUrl ? (
        <a
          href={image.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="-my-3.5 inline-block py-3.5 underline decoration-white/25 underline-offset-2 hover:text-white/70"
        >
          Wikimedia Commons
        </a>
      ) : (
        'Wikimedia Commons'
      )}
    </p>
  )
}
