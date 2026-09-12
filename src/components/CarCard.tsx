import { motion } from 'framer-motion'
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

const STAT_LABELS: [keyof CardView['stats'], string][] = [
  ['acc', 'ACC'],
  ['spd', 'SPD'],
  ['pwr', 'PWR'],
  ['han', 'HAN'],
  ['brk', 'BRK'],
  ['sty', 'STY'],
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
            : `linear-gradient(160deg, ${light} 0%, ${mid} 38%, ${deep} 100%)`,
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

        {/* rating block, top-left, FIFA style */}
        <div
          className="absolute z-10 flex flex-col items-center leading-none"
          style={{ left: 14 * scale, top: 48 * scale, width: 64 * scale }}
        >
          <span
            style={{
              fontSize: 42 * scale,
              fontWeight: 800,
              color: isSpecial ? '#ffd98a' : deep,
              letterSpacing: -1 * scale,
            }}
          >
            {card.overall}
          </span>
          <span
            style={{
              fontSize: 13 * scale,
              fontWeight: 700,
              letterSpacing: 1.5 * scale,
              color: isSpecial ? '#ffd98a' : deep,
              opacity: 0.85,
            }}
          >
            {card.country}
          </span>
          <span
            style={{
              marginTop: 4 * scale,
              fontSize: 10 * scale,
              fontWeight: 700,
              letterSpacing: 0.8 * scale,
              color: isSpecial ? '#ffd98a' : deep,
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

        {/* limited-edition banner */}
        {card.special && (
          <div
            className="absolute left-0 right-0 text-center"
            style={{ top: 232 * scale }}
          >
            <span
              style={{
                fontSize: 9 * scale,
                letterSpacing: 3 * scale,
                fontWeight: 800,
                color: '#ffd98a',
              }}
            >
              {card.special.label}
              {card.special.limitedTo ? ` · ${card.special.limitedTo} BUILT` : ''}
            </span>
          </div>
        )}

        {/* name */}
        <div
          className="absolute left-0 right-0 text-center"
          style={{ top: (card.special ? 250 : 244) * scale, padding: `0 ${14 * scale}px` }}
        >
          <div
            className="truncate"
            style={{
              fontSize: 20 * scale,
              fontWeight: 800,
              letterSpacing: 0.5 * scale,
              color: isSpecial ? '#fff6e0' : deep,
              textTransform: 'uppercase',
            }}
          >
            {card.model}
          </div>
          <div
            style={{
              fontSize: 11 * scale,
              fontWeight: 600,
              letterSpacing: 2 * scale,
              opacity: 0.72,
              color: isSpecial ? '#ffd9f4' : deep,
              textTransform: 'uppercase',
            }}
          >
            {card.make}
          </div>
        </div>

        {/* divider */}
        <div
          className="absolute"
          style={{
            left: 44 * scale,
            right: 44 * scale,
            top: 292 * scale,
            height: Math.max(1, 1 * scale),
            background: isSpecial ? 'rgba(255,215,140,.4)' : 'rgba(0,0,0,.22)',
          }}
        />

        {/* the six stats, two rows of three */}
        <div
          className="absolute grid grid-cols-3"
          style={{
            left: 26 * scale,
            right: 26 * scale,
            top: 304 * scale,
            rowGap: 6 * scale,
          }}
        >
          {STAT_LABELS.map(([key, label], i) => (
            <div key={key} className="flex items-baseline justify-center gap-1">
              <motion.span
                style={{
                  fontSize: 17 * scale,
                  fontWeight: 800,
                  color: isSpecial ? '#fff6e0' : deep,
                }}
                initial={animateStats ? { opacity: 0 } : false}
                animate={animateStats ? { opacity: 1 } : undefined}
                transition={{ delay: 0.1 + i * 0.07 }}
              >
                {card.stats[key]}
              </motion.span>
              <span
                style={{
                  fontSize: 10 * scale,
                  fontWeight: 600,
                  letterSpacing: 0.6 * scale,
                  opacity: 0.68,
                  color: isSpecial ? '#ffd9f4' : deep,
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
export const cardRating = (c: CardView) => c.overall ?? overall(c.stats)
