import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import { formatEuros } from '../game/economy'

/** The euro counter in the header. Rolls to new values rather than jumping. */
export function Balance({ amount }: { amount: number }) {
  const value = useMotionValue(amount)
  const text = useTransform(value, (v) => formatEuros(Math.round(v)))

  useEffect(() => {
    const controls = animate(value, amount, { duration: 0.6, ease: 'easeOut' })
    return () => controls.stop()
  }, [amount, value])

  return (
    <div className="flex items-baseline gap-2">
      <span className="hidden text-[10px] font-semibold tracking-[0.2em] text-white/40 sm:inline">
        BALANCE
      </span>
      <motion.span className="tabular-nums text-base font-extrabold text-gold-2 sm:text-xl">
        {text}
      </motion.span>
    </div>
  )
}
