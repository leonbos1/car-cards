import { motion } from 'framer-motion'
import type { CardView } from '../types'
import { glowFor } from './CarCard'

/**
 * A broadcast strip across the screen behind the card, reading WALKOUT on
 * repeat — it shows either side of the card, so even on a phone, where the
 * card fills most of the width, the edges of the screen say what happened.
 */
function Banner({ glow, reduced }: { glow: string; reduced: boolean }) {
  const words = Array.from({ length: 8 }, () => 'Walkout')
  const row = (
    <span className="flex shrink-0 items-center gap-6 pr-6">
      {words.map((w, i) => (
        <span key={i} className="flex items-center gap-6">
          {w}
          <span className="inline-block h-[0.5em] w-2 bg-current opacity-60" style={{ clipPath: 'polygon(40% 0, 100% 0, 60% 100%, 0 100%)' }} />
        </span>
      ))}
    </span>
  )
  return (
    <motion.div
      className="absolute inset-x-0 top-[46%] -translate-y-1/2"
      style={{ rotate: -6 }}
      initial={reduced ? { opacity: 0 } : { scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={{ duration: reduced ? 0.2 : 0.45, ease: 'easeOut', delay: reduced ? 0 : 0.15 }}
    >
      <div
        className="headline overflow-hidden border-y py-2 text-5xl"
        style={{
          color: glow,
          borderColor: `${glow}88`,
          background: `linear-gradient(90deg, transparent, ${glow}22 20%, ${glow}33 50%, ${glow}22 80%, transparent)`,
          textShadow: `0 0 24px ${glow}`,
        }}
      >
        <motion.div
          className="flex w-max"
          animate={reduced ? undefined : { x: ['0%', '-50%'] }}
          transition={{ duration: 14, ease: 'linear', repeat: Infinity }}
        >
          {row}
          {row}
        </motion.div>
      </div>
    </motion.div>
  )
}

/**
 * The full-screen light show behind a big pull. Rotating beams plus a particle
 * burst; the card itself is drawn by the caller on top of this.
 */
export function Walkout({ card, reduced }: { card: CardView; reduced: boolean }) {
  const glow = glowFor(card)

  if (reduced) {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background: `radial-gradient(circle at 50% 45%, ${glow}44 0%, transparent 62%)`,
          }}
        />
        <Banner glow={glow} reduced />
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* rotating volumetric beams */}
      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{ width: '260vmax', height: '260vmax', x: '-50%', y: '-50%' }}
        initial={{ rotate: 0, opacity: 0 }}
        animate={{ rotate: 360, opacity: 0.55 }}
        transition={{
          rotate: { duration: 26, ease: 'linear', repeat: Infinity },
          opacity: { duration: 0.8 },
        }}
      >
        <div
          className="h-full w-full"
          style={{
            background: `repeating-conic-gradient(from 0deg at 50% 50%, ${glow}00 0deg 7deg, ${glow}55 7deg 11deg)`,
            maskImage: 'radial-gradient(circle at 50% 50%, black 12%, transparent 62%)',
            WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 12%, transparent 62%)',
          }}
        />
      </motion.div>

      {/* core glow */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{
          background: `radial-gradient(circle at 50% 46%, ${glow}66 0%, ${glow}18 28%, transparent 60%)`,
        }}
      />

      <Banner glow={glow} reduced={false} />

      {/* particle burst */}
      {Array.from({ length: 34 }).map((_, i) => {
        const angle = (i / 34) * Math.PI * 2
        const distance = 240 + (i % 5) * 70
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 rounded-full"
            style={{ width: 5, height: 5, background: glow }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              opacity: [0, 1, 0],
              scale: [0, 1.3, 0.2],
            }}
            transition={{ duration: 1.5 + (i % 4) * 0.25, ease: 'easeOut', delay: 0.1 }}
          />
        )
      })}
    </div>
  )
}
