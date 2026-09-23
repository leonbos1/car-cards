import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Gauge, MousePointerClick, Timer, TrendingUp, Zap, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { formatEuros } from '../game/economy'
import {
  CLICKER_UPGRADES,
  calculateClickerMultipliers,
  nextUpgradeCost,
  processClick,
} from '../game/clicker'
import { useGame } from '../store/useGame'
import { PageHeader } from './ui/PageHeader'

/** Combo streak cap, from processClick in game/clicker. Display only. */
const COMBO_MAX = 50

/**
 * The clicker deals in cents and fractions of a cent, which formatEuros rounds
 * to "€ 0". Small amounts get their decimals here; whole-euro sums are left to
 * the shared formatter.
 */
function formatSmallEuros(amount: number): string {
  if (Math.abs(amount) >= 100) return formatEuros(amount)
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(amount)
}

const UPGRADE_ICON: Record<string, LucideIcon> = {
  'click-multiplier-1': Zap,
  'click-multiplier-2': Gauge,
  'auto-click-1': Timer,
}

interface Pop {
  id: number
  x: number
  y: number
  amount: number
}

export function Clicker() {
  const balance = useGame((s) => s.balance)
  const addBalance = useGame((s) => s.addBalance)
  const clickerState = useGame((s) => s.clickerState)
  const buyClickerUpgrade = useGame((s) => s.buyClickerUpgrade)
  const click = useGame((s) => s.click)
  const reduceMotion = useReducedMotion()

  const { clickMultiplier, autoClickPerSec } = calculateClickerMultipliers(
    clickerState.boughtUpgrades,
  )

  // Auto-click earnings
  useEffect(() => {
    if (autoClickPerSec === 0) return

    const interval = setInterval(() => {
      const earned = Math.round(autoClickPerSec * 100) / 100
      addBalance(earned)
    }, 1000)

    return () => clearInterval(interval)
  }, [autoClickPerSec, addBalance])

  // Floating "+€" numbers where the tap landed. Purely visual.
  const [pops, setPops] = useState<Pop[]>([])
  const popId = useRef(0)

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    const { earned, newState } = processClick(clickerState)
    click(newState)
    addBalance(earned)

    if (reduceMotion) return
    const rect = e.currentTarget.getBoundingClientRect()
    // A keyboard press has no pointer position; float from the middle.
    const fromPointer = e.detail > 0
    const x = fromPointer ? e.clientX - rect.left : rect.width / 2
    const y = fromPointer ? e.clientY - rect.top : rect.height / 2
    const id = ++popId.current
    setPops((p) => [...p.slice(-11), { id, x, y, amount: earned }])
  }

  const combo = clickerState.comboStreak
  const comboPct = Math.min(combo, COMBO_MAX) / COMBO_MAX

  return (
    <div>
      <PageHeader
        eyebrow="Side hustle"
        title="Clicker"
        subtitle="Tap the Alfa Romeo shield to earn money. Buy upgrades to increase your earning power."
      />

      {/* Main clicker area */}
      <section className="panel-cut relative mb-4 overflow-hidden px-4 pb-5 pt-4 sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[42%] size-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(227_28_28/0.28)_0%,rgb(227_28_28/0.06)_45%,transparent_70%)]"
        />

        {/* Combo meter */}
        <div className="relative mx-auto mb-4 max-w-sm">
          <div className="mb-1.5 flex items-end justify-between">
            <span className="eyebrow">Combo</span>
            <span
              className={`num text-2xl leading-none transition-colors ${combo > 1 ? 'text-gold-2' : 'text-white/30'}`}
              aria-live="off"
            >
              {combo > 1 ? `${combo}×` : '—'}
            </span>
          </div>
          <div className="h-2 overflow-hidden bg-white/[0.07]" style={{ clipPath: SLANT }}>
            <motion.div
              className="h-full bg-gradient-to-r from-gold-1 via-gold-2 to-gold-3 shadow-[0_0_10px_rgb(232_194_90/0.6)]"
              initial={false}
              animate={{ width: `${combo > 1 ? comboPct * 100 : 0}%` }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 40 }}
            />
          </div>
          <div className="mt-1.5 text-center text-xs text-white/45">Combo: +1% per level (max 50)</div>
        </div>

        <div className="relative flex justify-center py-2">
          <motion.button
            type="button"
            onClick={handleClick}
            aria-label="Tap the Alfa Romeo shield to earn money"
            whileTap={reduceMotion ? undefined : { scale: 0.92 }}
            whileHover={reduceMotion ? undefined : { scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 600, damping: 22 }}
            className="relative grid size-52 touch-manipulation place-items-center rounded-full bg-gradient-to-br from-red-500 via-red-700 to-red-950 shadow-[0_0_0_6px_rgb(255_255_255/0.06),0_0_0_7px_rgb(232_194_90/0.35),0_18px_40px_-8px_rgb(0_0_0/0.8),0_0_60px_-10px_rgb(227_28_28/0.7),inset_0_2px_0_rgb(255_255_255/0.25),inset_0_-10px_24px_rgb(0_0_0/0.35)] outline-none focus-visible:shadow-[0_0_0_4px_var(--color-gold-2)] sm:size-60"
          >
            <svg viewBox="0 0 100 120" className="pointer-events-none h-36 w-36 drop-shadow-[0_4px_8px_rgb(0_0_0/0.45)] sm:h-40 sm:w-40" fill="none">
              {/* Shield shape - more ornate */}
              <defs>
                <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#f0f0f0', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <path d="M 50 8 C 50 8 75 22 75 45 C 75 70 50 105 50 105 C 50 105 25 70 25 45 C 25 22 50 8 50 8 Z" fill="url(#shieldGrad)" stroke="#333" strokeWidth="1.5"/>

              {/* Savoy cross - red cross on white background */}
              {/* Vertical bar */}
              <rect x="42" y="30" width="16" height="60" fill="#E31C1C" rx="2"/>
              {/* Horizontal bar */}
              <rect x="28" y="52" width="44" height="16" fill="#E31C1C" rx="2"/>
            </svg>

            <AnimatePresence>
              {pops.map((p) => (
                <motion.span
                  key={p.id}
                  aria-hidden
                  initial={{ opacity: 1, y: 0, scale: 0.8 }}
                  animate={{ opacity: [1, 1, 0], y: -80, scale: 1.15 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  onAnimationComplete={() => setPops((all) => all.filter((q) => q.id !== p.id))}
                  className="num pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-2xl italic text-gold-3 [text-shadow:0_0_2px_#000,0_2px_8px_rgb(0_0_0/0.95),0_0_14px_rgb(232_194_90/0.6)]"
                  style={{ left: p.x, top: p.y }}
                >
                  +{formatSmallEuros(p.amount)}
                </motion.span>
              ))}
            </AnimatePresence>
          </motion.button>
        </div>

        <div className="relative mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 border border-gold-2/35 bg-gold-2/[0.1] px-3 py-1.5 text-sm text-white/70">
            <MousePointerClick size={15} strokeWidth={2.4} className="text-gold-2" />
            <span className="num text-base text-gold-2">+{formatSmallEuros(clickMultiplier)}</span> per click
          </span>
          {autoClickPerSec > 0 && (
            <span className="inline-flex items-center gap-1.5 border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/70">
              <Timer size={15} strokeWidth={2.4} className="text-go" />
              <span className="num text-base text-white">+{formatSmallEuros(autoClickPerSec)}/sec</span> automatic
            </span>
          )}
        </div>
      </section>

      {/* Stats */}
      <div className="panel mb-8 grid grid-cols-3 divide-x divide-white/[0.07]">
        <Readout label="Total clicks" value={clickerState.totalClicks.toLocaleString()} />
        <Readout label="From clicking" value={formatSmallEuros(clickerState.clickerEarnings)} />
        <Readout label="Balance" value={formatEuros(balance)} accent />
      </div>

      {/* Upgrades */}
      <h3 className="mb-3 flex items-center gap-2.5">
        <TrendingUp size={18} strokeWidth={2.4} className="text-gold-2" />
        <span className="headline text-xl">Upgrades</span>
        <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CLICKER_UPGRADES.map((upgrade) => {
          const level = clickerState.boughtUpgrades[upgrade.id] ?? 0
          const cost = nextUpgradeCost(upgrade, level)
          const maxed = !Number.isFinite(cost)
          const canAfford = balance >= cost
          const Icon = UPGRADE_ICON[upgrade.id] ?? Zap

          return (
            <button
              key={upgrade.id}
              type="button"
              onClick={() => buyClickerUpgrade(upgrade.id)}
              disabled={!canAfford}
              className={`group flex flex-col overflow-hidden rounded-xl border text-left transition ${
                canAfford
                  ? 'border-gold-2/40 bg-gradient-to-br from-asphalt-3 via-asphalt-2 to-asphalt shadow-[0_0_24px_-10px_rgb(232_194_90/0.6)] hover:border-gold-2/75 active:scale-[0.99]'
                  : 'cursor-not-allowed border-white/[0.07] bg-asphalt/80'
              }`}
            >
              <div className="flex items-start gap-3 p-3.5">
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-lg ${
                    canAfford
                      ? 'bg-gradient-to-b from-[#ffe08a] to-[#b8871f] text-[#2a1c02] shadow-[0_0_14px_rgb(232_194_90/0.4)]'
                      : 'bg-white/[0.05] text-white/40'
                  }`}
                >
                  <Icon size={22} strokeWidth={2.4} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`font-display text-lg font-bold uppercase italic leading-tight ${canAfford ? '' : 'text-white/60'}`}>
                    {upgrade.name}
                  </div>
                  <div className="text-sm text-white/55">{upgrade.description}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="eyebrow">Level</div>
                  <div className={`num text-2xl leading-none ${level > 0 ? 'text-gold-2' : 'text-white/30'}`}>{level}</div>
                </div>
              </div>
              <span
                className={`mt-auto flex min-h-11 items-center justify-between px-3.5 font-display font-extrabold uppercase italic tracking-wide ${
                  canAfford
                    ? 'bg-gradient-to-b from-[#ffe08a] via-gold-2 to-[#c99a2e] text-[#1a1204] shadow-[inset_0_1px_0_rgb(255_255_255/0.55)]'
                    : 'border-t border-white/[0.06] bg-black/30 text-white/45'
                }`}
              >
                <span>{maxed ? 'Maxed' : canAfford ? (level > 0 ? `Upgrade to L${level + 1}` : 'Buy') : 'Not enough money'}</span>
                <span className="num text-lg not-italic">{maxed ? '—' : formatEuros(cost)}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const SLANT = 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)'

function Readout({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0 px-2.5 py-3 text-center sm:px-4">
      <div className="eyebrow truncate">{label}</div>
      <div className={`num mt-1 truncate text-lg leading-none sm:text-2xl ${accent ? 'text-gold-2' : ''}`}>{value}</div>
    </div>
  )
}
