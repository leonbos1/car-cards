import { useState } from 'react'
import { PACK_BY_ID, contentsLine } from '../data/packs'
import { ALL_CARDS } from '../game/pack'
import { ownedCards, useGame } from '../store/useGame'

const DAILY_PACK = PACK_BY_ID.get('daily-free')!

interface Props {
  onReset: () => void
}

export function Settings({ onReset }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [editingCards, setEditingCards] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string>('')
  const [editStats, setEditStats] = useState<Record<string, number>>({})
  const [searchQuery, setSearchQuery] = useState<string>('')
  const packsOpened = useGame((s) => s.packsOpened)
  // Counted from cars actually owned rather than from the keys of the
  // collection, and against the real roster size rather than a number typed by
  // hand — both were wrong the moment a car could be sold down to nothing.
  const collectionSize = ownedCards(useGame((s) => s.collection)).length
  const balance = useGame((s) => s.balance)
  const raceAnimationMs = useGame((s) => s.raceAnimationMs)
  const setRaceAnimationMs = useGame((s) => s.setRaceAnimationMs)
  const overrideCardStats = useGame((s) => s.overrideCardStats)
  const clearCardOverride = useGame((s) => s.clearCardOverride)
  const cardOverrides = useGame((s) => s.cardOverrides)
  const ownedCars = ownedCards(useGame((s) => s.collection))

  const handleReset = () => {
    useGame.getState().reset()
    onReset()
    setConfirming(false)
  }

  const handleSaveCardEdit = () => {
    if (selectedCardId && Object.keys(editStats).length > 0) {
      overrideCardStats(selectedCardId, editStats)
      setSelectedCardId('')
      setEditStats({})
    }
  }

  const handleClearOverride = (carId: string) => {
    clearCardOverride(carId)
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Settings</h2>
          <p className="text-sm text-white/45">Game configuration and data management</p>
        </div>

        {/* Game Tuning */}
        <div className="rounded-lg bg-white/5 p-6">
          <h3 className="mb-4 text-lg font-bold">Game Tuning</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-white/80">
                Race animation duration (milliseconds)
              </label>
              <input
                type="number"
                min="500"
                max="10000"
                step="100"
                value={raceAnimationMs}
                onChange={(e) => setRaceAnimationMs(Number(e.target.value))}
                className="mt-2 w-full rounded-lg bg-white/10 px-3 py-2 text-white placeholder:text-white/30"
              />
              <p className="mt-1 text-xs text-white/45">
                Current: {raceAnimationMs}ms ({(3600000 / raceAnimationMs).toFixed(0)} races/hour)
              </p>
            </div>
          </div>
        </div>

        {/* Card Management */}
        <div className="rounded-lg bg-white/5 p-6">
          <h3 className="mb-4 text-lg font-bold">Card Management</h3>
          {editingCards ? (
            <div className="space-y-4">
              {cardOverrides && Object.keys(cardOverrides).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-white/70">Overridden Cards:</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {Object.entries(cardOverrides).map(([carId]) => {
                      const car = ALL_CARDS.find((c) => c.id === carId)
                      return (
                        <div
                          key={carId}
                          className="flex items-center justify-between rounded-lg bg-white/10 p-2 text-xs"
                        >
                          <span>
                            {car?.make} {car?.model} {car?.year}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleClearOverride(carId)}
                            className="rounded bg-red-600/60 px-2 py-1 text-xs font-bold hover:bg-red-600"
                          >
                            Clear
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-semibold text-white/80">Search and select a car to edit:</label>
                <input
                  type="text"
                  placeholder="Search by make, model, or year..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mt-2 w-full rounded-lg bg-white/10 px-3 py-2 text-white placeholder:text-white/30"
                />
                {searchQuery && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-white/5 p-2 space-y-1">
                    {ownedCars
                      .filter((car) => {
                        const query = searchQuery.toLowerCase()
                        return (
                          car.make.toLowerCase().includes(query) ||
                          car.model.toLowerCase().includes(query) ||
                          car.year.toString().includes(query)
                        )
                      })
                      .slice(0, 50)
                      .map((car) => (
                        <button
                          key={car.id}
                          type="button"
                          onClick={() => {
                            setSelectedCardId(car.id)
                            setEditStats({})
                            setSearchQuery('')
                          }}
                          className="w-full text-left rounded px-2 py-1 text-sm text-white/70 hover:bg-white/10 hover:text-white transition"
                        >
                          {car.make} {car.model} {car.year}
                        </button>
                      ))}
                    {ownedCars.filter((car) => {
                      const query = searchQuery.toLowerCase()
                      return (
                        car.make.toLowerCase().includes(query) ||
                        car.model.toLowerCase().includes(query) ||
                        car.year.toString().includes(query)
                      )
                    }).length === 0 && (
                      <p className="text-xs text-white/40 px-2 py-1">No cars found</p>
                    )}
                  </div>
                )}
              </div>

              {selectedCardId && (
                <div className="space-y-3 rounded-lg bg-black/30 p-3">
                  <p className="text-xs font-bold text-white/60">Edit Stats</p>
                  {(['hp', 'acc', 'topspeed', 'weight', 'handling', 'wowFactor'] as const).map(
                    (stat) => (
                      <div key={stat}>
                        <label className="text-xs font-semibold text-white/70">
                          {stat === 'acc' ? '0-100 time (s)' : stat}
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder={String(
                            ALL_CARDS.find((c) => c.id === selectedCardId)?.stats[stat] || 0,
                          )}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setEditStats((s) => {
                              const next = { ...s }
                              if (e.target.value && !isNaN(val)) {
                                next[stat] = val
                              } else {
                                delete next[stat]
                              }
                              return next
                            })
                          }}
                          className="mt-1 w-full rounded bg-white/10 px-2 py-1 text-xs text-white placeholder:text-white/30"
                        />
                      </div>
                    ),
                  )}
                  <button
                    type="button"
                    onClick={handleSaveCardEdit}
                    className="w-full rounded-lg bg-gold-2 px-3 py-2 text-xs font-bold text-black transition hover:brightness-110"
                  >
                    Apply Changes
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setEditingCards(false)
                  setSelectedCardId('')
                  setEditStats({})
                }}
                className="w-full rounded-lg border border-white/20 px-3 py-2 text-sm font-bold text-white/70 transition hover:text-white"
              >
                Done
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingCards(true)}
              className="w-full rounded-lg bg-gold-2 px-4 py-2 text-sm font-bold text-black transition hover:brightness-110"
            >
              Edit Card Stats
            </button>
          )}
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
              <span className="font-extrabold">{collectionSize} / {ALL_CARDS.length}</span>
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
              The free daily pack contains: <strong>{contentsLine(DAILY_PACK)}</strong>
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
