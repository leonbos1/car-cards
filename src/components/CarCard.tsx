import { motion } from 'framer-motion'
import { useLayoutEffect, useState } from 'react'
import IMAGES from '../data/car-images.json'
import { overall } from '../game/rating'
import type { CardClass, CardView } from '../types'

const images = IMAGES as Record<string, { file: string }>

/** Palette per card class: [deep, mid, light]. */
export const CLASS_COLORS: Record<CardClass, [string, string, string]> = {
  bronze: ['#6b4423', '#c98f4e', '#f3d2a8'],
  silver: ['#4a5259', '#b4bec8', '#f0f4f8'],
  gold: ['#7a5c14', '#e8c25a', '#fff2c4'],
  special: ['#10060f', '#6d1f5e', '#ffd9f4'],
}

/** The glow thrown behind a card during a reveal — brighter as rarity climbs. */
export function glowFor(card: Pick<CardView, 'cardClass' | 'rare'>): string {
  const [, mid, light] = CLASS_COLORS[card.cardClass]
  // Near-white light tones wash out to grey against the black opening screen,
  // so the saturated mid tone carries the rarity colour instead.
  if (card.cardClass === 'special') return light
  return mid
}

/** Text on the lower half of a non-special card: the deep tone, darkened. */
const TEXT_INK: Record<CardClass, string> = {
  bronze: '#2f1b0b',
  silver: '#1d2328',
  gold: '#352607',
  special: '#fff6e0',
}

const STAT_LABELS: [keyof CardView['stats'], string][] = [
  ['hp', 'HP'],
  ['acc', 'ACC'],
  ['topspeed', 'SPD'],
  ['weight', 'WGT'],
  ['handling', 'HAN'],
  ['wowFactor', 'WOW'],
]

interface Props {
  card: CardView
  /** 1 = standard card width (280px). */
  scale?: number
  /** Counts stats up from zero instead of showing them immediately. */
  animateStats?: boolean
  onClick?: () => void
  className?: string
}

export function CarCard({ card, scale = 1, animateStats = false, onClick, className }: Props) {
  const [deep, mid, light] = CLASS_COLORS[card.cardClass]
  const image = images[card.id]
  const isSpecial = card.cardClass === 'special'
  /** The colour the rating column is printed in. */
  const ink = isSpecial ? '#ffd98a' : deep
  // The lower half of a card sits on the darker end of its gradient, where the
  // deep tone all but vanished; name and stats print in a darker ink instead.
  const lowInk = TEXT_INK[card.cardClass]

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`relative block shrink-0 text-left ${onClick ? 'cursor-pointer' : 'cursor-default'} ${className ?? ''}`}
      style={{ width: 280 * scale, height: 392 * scale }}
      whileHover={onClick ? { y: -6, scale: 1.02 } : undefined}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
    >
      {/* card body */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          borderRadius: 18 * scale,
          background: isSpecial
            ? `linear-gradient(160deg, #1b0a1c 0%, #2b1030 45%, #120610 100%)`
            : `linear-gradient(160deg, ${light} 0%, ${mid} 40%, ${deep} 125%)`,
          boxShadow: `0 ${18 * scale}px ${40 * scale}px rgba(0,0,0,.55), inset 0 0 0 ${2 * scale}px ${isSpecial ? '#c9a227' : light}`,
        }}
      >
        {/* rare cards get a diagonal sheen; specials get a gold filigree wash */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: card.rare
              ? `linear-gradient(115deg, transparent 30%, rgba(255,255,255,.28) 45%, transparent 62%)`
              : 'none',
          }}
        />
        {isSpecial && (
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                'radial-gradient(circle at 50% 22%, rgba(255,205,90,.35) 0%, transparent 55%)',
            }}
          />
        )}

        {/* rating block, top-left, FIFA style — set in the display face so the
            number reads like a timing screen */}
        <div
          className="absolute z-10 flex flex-col items-center font-display"
          style={{ left: 14 * scale, top: 44 * scale, width: 64 * scale, color: ink }}
        >
          <span
            className="num italic"
            style={{
              fontSize: 54 * scale,
              lineHeight: 0.9,
              letterSpacing: -1 * scale,
              textShadow: isSpecial ? `0 0 ${14 * scale}px rgba(255,190,80,.45)` : undefined,
            }}
          >
            {card.overall}
          </span>
          <span
            aria-hidden
            style={{
              marginTop: 5 * scale,
              width: 26 * scale,
              height: Math.max(1, 1.5 * scale),
              background: 'currentColor',
              opacity: 0.45,
            }}
          />
          <span
            style={{
              marginTop: 5 * scale,
              fontSize: 15 * scale,
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing: 1.5 * scale,
              opacity: 0.9,
            }}
          >
            {card.country}
          </span>
          <span
            className="tabular-nums"
            style={{
              marginTop: 3 * scale,
              fontSize: 12 * scale,
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: 0.8 * scale,
              opacity: 0.7,
            }}
          >
            {card.year}
          </span>
        </div>

        {/* the photo, inset so the rating column stays readable */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: 84 * scale,
            right: 8 * scale,
            top: 46 * scale,
            height: 172 * scale,
            borderRadius: 8 * scale,
          }}
        >
          {image ? (
            <img
              src={`${import.meta.env.BASE_URL}cars/${image.file}`}
              alt={`${card.make} ${card.model}`}
              loading="lazy"
              className="h-full w-full object-cover"
              style={{
                maskImage: 'linear-gradient(to bottom, black 74%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 74%, transparent 100%)',
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs opacity-40">
              no photo
            </div>
          )}
        </div>

        {/*
          Special label, name and make share one flex column in a fixed band
          between the photo and the divider. The label used to be positioned on
          its own at a fixed top, and its line box took the page's unscaled
          16px line-height, so at garage scale it dropped straight onto the
          name. In one column with explicit line-heights they stack and can
          never overlap, whatever the lengths.
        */}
        <div
          className="absolute left-0 right-0 flex flex-col items-center justify-center text-center font-display"
          style={{
            top: 222 * scale,
            height: 66 * scale,
            padding: `0 ${14 * scale}px`,
            gap: 3 * scale,
          }}
        >
          {card.special && (
            <span
              className="block max-w-full truncate"
              style={{
                marginBottom: 1 * scale,
                padding: `${2.5 * scale}px ${9 * scale}px`,
                fontSize: 10 * scale,
                lineHeight: 1,
                fontWeight: 800,
                fontStyle: 'italic',
                letterSpacing: 1.4 * scale,
                textTransform: 'uppercase',
                color: '#2a1703',
                background: 'linear-gradient(180deg, #ffe7a6 0%, #e0b24a 55%, #b8862a 100%)',
                clipPath: `polygon(${5 * scale}px 0, 100% 0, calc(100% - ${5 * scale}px) 100%, 0 100%)`,
              }}
            >
              {card.special.label}
              {card.special.limitedTo ? ` · ${card.special.limitedTo} BUILT` : ''}
            </span>
          )}
          <span
            className="block max-w-full truncate"
            style={{
              fontSize: 25 * scale,
              lineHeight: 1,
              fontWeight: 800,
              fontStyle: 'italic',
              letterSpacing: 0.3 * scale,
              color: isSpecial ? '#fff6e0' : lowInk,
              textTransform: 'uppercase',
              // Room for the italic overhang, which truncate would otherwise clip.
              paddingRight: 2 * scale,
            }}
          >
            {card.model}
          </span>
          <span
            className="block max-w-full truncate"
            style={{
              fontSize: 12.5 * scale,
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: 2.2 * scale,
              opacity: 0.75,
              color: isSpecial ? '#ffd9f4' : lowInk,
              textTransform: 'uppercase',
            }}
          >
            {card.make}
          </span>
        </div>

        {/* divider */}
        <div
          className="absolute"
          style={{
            left: 44 * scale,
            right: 44 * scale,
            top: 292 * scale,
            height: Math.max(1, 1 * scale),
            background: isSpecial
              ? 'linear-gradient(90deg, transparent, rgba(255,215,140,.6), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(0,0,0,.3), transparent)',
          }}
        />

        {/* the six stats, two rows of three */}
        <div
          className="absolute grid grid-cols-3 font-display"
          style={{
            left: 22 * scale,
            right: 22 * scale,
            top: 302 * scale,
            rowGap: 5 * scale,
          }}
        >
          {STAT_LABELS.map(([key, label], i) => (
            <div key={key} className="flex items-baseline justify-center" style={{ gap: 3 * scale }}>
              <motion.span
                className="num"
                style={{
                  fontSize: 20 * scale,
                  lineHeight: 1.1,
                  color: isSpecial ? '#fff6e0' : lowInk,
                }}
                initial={animateStats ? { opacity: 0 } : false}
                animate={animateStats ? { opacity: 1 } : undefined}
                transition={{ delay: 0.1 + i * 0.07 }}
              >
                {card.stats[key]}
              </motion.span>
              <span
                style={{
                  fontSize: 11 * scale,
                  lineHeight: 1,
                  fontWeight: 700,
                  letterSpacing: 0.8 * scale,
                  opacity: 0.65,
                  color: isSpecial ? '#ffd9f4' : lowInk,
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.button>
  )
}

/** Used by the garage to sort without recomputing ratings. */
export const cardRating = (c: CardView) => c.overall ?? overall(c.stats, c.year)

/**
 * Fits a grid of cards to the width it is given.
 *
 * A card is drawn at a fixed pixel size times `scale`, so a CSS grid alone
 * either leaves an empty band on the right or crops the card. This measures
 * the grid, picks how many columns fit (never fewer than two, so a 360px phone
 * still shows a pair), and returns the scale that makes each card exactly one
 * column wide. Attach `ref` to the grid element and spread `style` on it.
 */
export function useCardGrid({ minWidth = 170, maxScale = 1 }: { minWidth?: number; maxScale?: number } = {}) {
  const [el, setEl] = useState<HTMLElement | null>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    if (!el) return
    setWidth(el.clientWidth)
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [el])

  // Tighter gutters on a phone, where every pixel goes to the cards.
  const gap = width && width < 480 ? 10 : width < 900 ? 14 : 18
  const cols = Math.max(2, Math.floor((width + gap) / (minWidth + gap)))
  const cell = width ? (width - gap * (cols - 1)) / cols : minWidth
  const scale = Math.min(maxScale, Math.floor((cell / 280) * 1000) / 1000)

  return {
    ref: setEl,
    scale,
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      columnGap: gap,
      rowGap: gap + 6,
      justifyItems: 'center',
    } as const,
  }
}
