import { useState } from 'react'
import { useGame } from '../store/useGame'

interface Props {
  onReset: () => void
}

export function Settings({ onReset }: Props) {
  const [confirming, setConfirming] = useState(false)
  const packsOpened = useGame((s) => s.packsOpened)
  const collectionSize = Object.keys(useGame((s) => s.collection)).length
  const balance = useGame((s) => s.balance)

  const handleReset = () => {
    useGame.getState().reset()
    onReset()
    setConfirming(false)
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Settings</h2>
          <p className="text-sm text-white/45">Game configuration and data management</p>
        </div>

        {/* Game Stats */}
        <div className="rounded-lg bg-white/5 p-6">
          <h3 className="mb-4 text-lg font-bold">Game Statistics</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-white/5 p-3">
              <span className="text-sm text-white/70">Current Balance</span>
              <span className="font-extrabold text-gold-2">{balance.toLocaleString()} €</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/5 p-3">
              <span className="text-sm text-white/70">Packs Opened</span>
              <span className="font-extrabold">{packsOpened}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/5 p-3">
              <span className="text-sm text-white/70">Unique Cars Collected</span>
              <span className="font-extrabold">{collectionSize} / 1090</span>
            </div>
          </div>
        </div>

        {/* Game Info */}
        <div className="rounded-lg bg-white/5 p-6">
          <h3 className="mb-4 text-lg font-bold">About This Game</h3>
          <div className="space-y-3 text-sm text-white/70">
            <p>
              <strong>Car Cards</strong> is a FIFA-style pack-opening game for cars. Spend your virtual euros on packs to collect
              rare and exotic vehicles.
            </p>
            <p>
              The free daily pack contains: <strong>1 Gold, 4 Silver, 3 Bronze</strong>
            </p>
            <p>Gold cars are extremely rare - plan your collection carefully!</p>
            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs font-bold text-white/60">Rarity Tiers:</p>
              <ul className="mt-2 space-y-1 text-xs text-white/50">
                <li>🟤 Bronze: Common vehicles (overall &lt; 70)</li>
                <li>⚪ Silver: Uncommon vehicles (overall 70-79)</li>
                <li>🟡 Gold: Rare vehicles (overall ≥ 80)</li>
                <li>💜 Special: Limited edition supercars</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Reset Progress */}
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6">
          <h3 className="mb-2 text-lg font-bold text-red-400">Reset Progress</h3>
          <p className="mb-4 text-sm text-white/60">
            Start over with a fresh save. This will delete your collection and reset your balance to €10,000,000.
          </p>

          {confirming ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-200">
                <p className="font-bold">Are you sure?</p>
                <p className="text-xs text-red-300/80">
                  This cannot be undone. You will lose:
                </p>
                <ul className="mt-2 space-y-1 text-xs text-red-300">
                  <li>• {collectionSize} cars from your collection</li>
                  <li>• All progress and packs opened</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  Yes, Reset Everything
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-sm font-bold transition hover:bg-white/20"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-lg bg-red-600/80 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-600"
            >
              Reset Progress
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-white/30">
          <p>Car Cards • All data is saved locally to your browser</p>
        </div>
      </div>
    </div>
  )
}
