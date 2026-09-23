import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { Euro } from 'lucide-react'
import { useEffect } from 'react'
import { formatAmount } from '../game/economy'

/** The euro counter in the HUD. Rolls to new values rather than jumping. */
export function Balance({ amount }: { amount: number }) {
  const value = useMotionValue(amount)
  const text = useTransform(value, (v) => formatAmount(Math.round(v)))

  useEffect(() => {
    const controls = animate(value, amount, { duration: 0.6, ease: 'easeOut' })
    return () => controls.stop()
  }, [amount, value])

  return (
    <div
      className="flex h-9 items-center gap-2 rounded-full border border-gold-2/25 bg-black/40 pl-1 pr-3.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
      title="Balance"
    >
      <span className="grid size-7 place-items-center rounded-full bg-gradient-to-b from-[#ffe08a] to-[#b8871f] text-[#2a1c02] shadow-[inset_0_1px_0_rgb(255_255_255/0.6),0_0_12px_rgb(232_194_90/0.35)]">
        <Euro size={15} strokeWidth={3} />
      </span>
      <motion.span className="num text-lg leading-none text-gold-2">{text}</motion.span>
    </div>
  )
}
