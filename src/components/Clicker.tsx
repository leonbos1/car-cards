import { useEffect } from 'react'
import { formatEuros } from '../game/economy'
import {
  CLICKER_UPGRADES,
  calculateClickerMultipliers,
  nextUpgradeCost,
  processClick,
} from '../game/clicker'
import { useGame } from '../store/useGame'

export function Clicker() {
  const balance = useGame((s) => s.balance)
  const addBalance = useGame((s) => s.addBalance)
  const clickerState = useGame((s) => s.clickerState)
  const buyClickerUpgrade = useGame((s) => s.buyClickerUpgrade)
  const click = useGame((s) => s.click)

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

  const handleClick = () => {
    const { earned, newState } = processClick(clickerState)
    click(newState)
    addBalance(earned)
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-6">
      <h2 className="mb-1 text-2xl font-extrabold tracking-tight">Clicker</h2>
      <p className="mb-6 text-sm text-white/45">
        Tap the Alfa Romeo shield to earn money. Buy upgrades to increase your earning power.
      </p>

      {/* Main clicker area */}
      <div className="mb-8 text-center">
        <div className="mb-4 text-sm text-white/60">
          {clickerState.comboStreak > 1 && (
            <span>
              Combo: <span className="font-bold text-gold-2">{clickerState.comboStreak}×</span>
            </span>
          )}
        </div>

        <button
          onClick={handleClick}
          className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-red-800 text-6xl font-black text-white shadow-lg transition hover:scale-105 active:scale-95"
        >
          Ⓜ
        </button>

        <div className="text-sm font-bold text-gold-2">
          +{formatEuros(clickMultiplier)} per click
        </div>
        <div className="text-xs text-white/60">Combo: +1% per level (max 50)</div>
        {autoClickPerSec > 0 && (
          <div className="mt-2 text-xs text-white/60">
            +{formatEuros(autoClickPerSec)}/sec automatic
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center">
          <div className="text-xs text-white/50">Total Clicks</div>
          <div className="text-lg font-bold">{clickerState.totalClicks.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center">
          <div className="text-xs text-white/50">From Clicking</div>
          <div className="text-lg font-bold">{formatEuros(clickerState.clickerEarnings)}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center">
          <div className="text-xs text-white/50">Balance</div>
          <div className="text-lg font-bold text-gold-2">{formatEuros(balance)}</div>
        </div>
      </div>

      {/* Upgrades */}
      <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/40">Upgrades</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {CLICKER_UPGRADES.map((upgrade) => {
          const level = clickerState.boughtUpgrades[upgrade.id] ?? 0
          const cost = nextUpgradeCost(upgrade, level)
          const canAfford = balance >= cost

          return (
            <button
              key={upgrade.id}
              onClick={() => buyClickerUpgrade(upgrade.id)}
              disabled={!canAfford}
              className={`rounded-xl border p-3 text-left transition ${
                canAfford
                  ? 'border-gold-2/30 bg-gold-2/[0.08] hover:border-gold-2/60 hover:bg-gold-2/[0.12]'
                  : 'border-white/10 bg-white/[0.03] opacity-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold">{upgrade.name}</div>
                  <div className="text-xs text-white/60">{upgrade.description}</div>
                </div>
                {level > 0 && (
                  <div className="shrink-0 rounded-lg bg-gold-2/30 px-2 py-1 text-xs font-bold text-gold-2">
                    L{level}
                  </div>
                )}
              </div>
              <div className="mt-2 text-sm font-bold text-gold-2">{formatEuros(cost)}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
