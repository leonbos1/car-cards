import { AlertTriangle, BarChart3, Info, Pencil, SlidersHorizontal, Trash2, X, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { PACK_BY_ID, contentsLine } from '../data/packs'
import { STARTING_BALANCE, formatEuros } from '../game/economy'
import { ALL_CARDS } from '../game/pack'
import { ownedCards, useGame } from '../store/useGame'
import { PageHeader } from './ui/PageHeader'

const DAILY_PACK = PACK_BY_ID.get('daily-free')!

interface Props {
  onReset: () => void
}

const STAT_FIELDS = ['hp', 'acc', 'topspeed', 'weight', 'handling', 'wowFactor'] as const

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

  const query = searchQuery.toLowerCase()
  const matches = searchQuery
    ? ALL_CARDS.filter(
        (car) =>
          car.make.toLowerCase().includes(query) ||
          car.model.toLowerCase().includes(query) ||
          car.year.toString().includes(query),
      )
    : []
  const selectedCar = selectedCardId ? ALL_CARDS.find((c) => c.id === selectedCardId) : undefined
  const overrideIds = cardOverrides ? Object.keys(cardOverrides) : []

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Options" title="Settings" subtitle="Game configuration and data management" />

      {/* Game Tuning */}
      <Section icon={SlidersHorizontal} title="Game Tuning">
        <div className="panel p-4 sm:p-5">
          <label htmlFor="race-anim-ms" className="block text-sm font-semibold text-white/85">
            Race animation duration (milliseconds)
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              id="race-anim-ms"
              type="number"
              inputMode="numeric"
              min="500"
              max="10000"
              step="100"
              value={raceAnimationMs}
              onChange={(e) => setRaceAnimationMs(Number(e.target.value))}
              className="field num w-full text-lg sm:w-40"
            />
            <div className="flex gap-5">
              <div>
                <div className="eyebrow">Current</div>
                <div className="num text-xl leading-tight">
                  {raceAnimationMs}
                  <span className="text-sm text-white/45">ms</span>
                </div>
              </div>
              <div>
                <div className="eyebrow">Races / hour</div>
                <div className="num text-xl leading-tight text-gold-2">{(3600000 / raceAnimationMs).toFixed(0)}</div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Card Management */}
      <Section icon={Pencil} title="Card Management">
        <div className="panel p-4 sm:p-5">
          {editingCards ? (
            <div className="space-y-5">
              {overrideIds.length > 0 && (
                <div>
                  <p className="eyebrow mb-2">Overridden Cards</p>
                  <ul className="max-h-48 space-y-1.5 overflow-y-auto">
                    {overrideIds.map((carId) => {
                      const car = ALL_CARDS.find((c) => c.id === carId)
                      return (
                        <li
                          key={carId}
                          className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] py-1.5 pl-3 pr-1.5 text-sm"
                        >
                          <span className="min-w-0 truncate">
                            {car?.make} {car?.model} <span className="text-white/45">{car?.year}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleClearOverride(carId)}
                            className="btn btn-secondary btn-sm shrink-0"
                          >
                            <X size={14} strokeWidth={3} /> Clear
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              <div>
                <label htmlFor="card-search" className="block text-sm font-semibold text-white/85">
                  Search and select a car to edit:
                </label>
                <input
                  id="card-search"
                  type="text"
                  placeholder="Search by make, model, or year..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="field mt-2 w-full placeholder:text-white/30"
                />
                {searchQuery && (
                  <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-pitch/80">
                    {matches.slice(0, 50).map((car) => {
                      const isOwned = ownedCars.some((c) => c.id === car.id)
                      return (
                        <button
                          key={car.id}
                          type="button"
                          onClick={() => {
                            setSelectedCardId(car.id)
                            setEditStats({})
                            setSearchQuery('')
                          }}
                          className="flex min-h-11 w-full items-center gap-2 border-b border-white/5 px-3 py-2 text-left text-sm text-white transition last:border-b-0 hover:bg-white/[0.08]"
                        >
                          <span className="min-w-0 flex-1">
                            {car.make} {car.model} <span className="text-white/60">({car.year})</span>
                          </span>
                          {!isOwned && <span className="shrink-0 text-xs text-white/40">(not owned)</span>}
                        </button>
                      )
                    })}
                    {matches.length === 0 && <p className="px-3 py-2 text-sm text-white/40">No cars found</p>}
                  </div>
                )}
              </div>

              {selectedCardId && (
                <div className="rounded-xl border border-gold-2/25 bg-black/30 p-3.5 sm:p-4">
                  <p className="eyebrow">Edit Stats</p>
                  {selectedCar && (
                    <p className="mt-1 font-display text-lg font-bold uppercase italic leading-tight">
                      {selectedCar.make} {selectedCar.model}{' '}
                      <span className="text-white/45">{selectedCar.year}</span>
                    </p>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {STAT_FIELDS.map((stat) => (
                      <div key={stat} className="min-w-0">
                        <label htmlFor={`stat-${stat}`} className="block text-xs font-semibold text-white/70">
                          {stat === 'acc' ? '0-100 time (s)' : stat}
                        </label>
                        <input
                          id={`stat-${stat}`}
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          placeholder={String(selectedCar?.stats[stat] || 0)}
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
                          className="field num mt-1 w-full placeholder:text-white/30"
                        />
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={handleSaveCardEdit} className="btn btn-primary mt-4 w-full">
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
                className="btn btn-secondary w-full"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 flex-1 text-sm text-white/55">
                Override a car's stats for testing.
                {overrideIds.length > 0 && (
                  <span className="ml-1 text-gold-2">
                    <span className="num">{overrideIds.length}</span> overridden.
                  </span>
                )}
              </p>
              <button type="button" onClick={() => setEditingCards(true)} className="btn btn-secondary w-full sm:w-auto">
                <Pencil size={15} strokeWidth={2.6} /> Edit Card Stats
              </button>
            </div>
          )}
        </div>
      </Section>

      {/* Game Stats */}
      <Section icon={BarChart3} title="Game Statistics">
        <div className="panel grid grid-cols-1 divide-y divide-white/[0.07] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Stat label="Current Balance" value={`${balance.toLocaleString()} €`} accent />
          <Stat label="Packs Opened" value={String(packsOpened)} />
          <Stat
            label="Unique Cars Collected"
            value={
              <>
                {collectionSize}
                <span className="text-white/35"> / {ALL_CARDS.length}</span>
              </>
            }
          />
        </div>
      </Section>

      {/* Game Info */}
      <Section icon={Info} title="About This Game">
        <div className="panel space-y-3 p-4 text-sm leading-relaxed text-white/70 sm:p-5">
          <p>
            <strong className="text-white">Car Cards</strong> is a FIFA-style pack-opening game for cars. Spend your
            virtual euros on packs to collect rare and exotic vehicles.
          </p>
          <p>
            The free daily pack contains: <strong className="text-white">{contentsLine(DAILY_PACK)}</strong>
          </p>
          <p>Gold cars are extremely rare - plan your collection carefully!</p>
          <div className="mt-4 rounded-lg border border-white/[0.07] bg-black/20 p-3">
            <p className="eyebrow">Rarity Tiers</p>
            <ul className="mt-2 space-y-1.5 text-sm text-white/60">
              <Tier swatch="bg-gradient-to-br from-bronze-3 to-bronze-1" name="Bronze" text="Common vehicles (overall < 70)" />
              <Tier swatch="bg-gradient-to-br from-silver-3 to-silver-1" name="Silver" text="Uncommon vehicles (overall 70-79)" />
              <Tier swatch="bg-gradient-to-br from-gold-3 to-gold-1" name="Gold" text="Rare vehicles (overall ≥ 80)" />
              <Tier
                swatch="bg-gradient-to-br from-special-3 via-special-2 to-special-1 ring-1 ring-special-3/50"
                name="Special"
                text="Limited edition supercars"
              />
            </ul>
          </div>
        </div>
      </Section>

      {/* Reset Progress — set apart from everything above, because it cannot be undone. */}
      <section className="border-t border-signal/20 pt-8" aria-labelledby="danger-zone">
        <div className="rounded-xl border border-signal/30 bg-gradient-to-b from-signal/[0.08] to-signal/[0.02] p-4 sm:p-5">
          <div className="flex items-center gap-2 text-signal">
            <AlertTriangle size={18} strokeWidth={2.5} />
            <h3 id="danger-zone" className="headline text-xl">
              Reset Progress
            </h3>
          </div>
          <p className="mt-2 text-sm text-white/65">
            Start over with a fresh save. This will delete your collection and reset your balance to{' '}
            {formatEuros(STARTING_BALANCE)}.
          </p>

          {confirming ? (
            <div className="mt-4 space-y-3" role="alertdialog" aria-labelledby="reset-confirm-title">
              <div className="rounded-lg border border-signal/40 bg-signal/[0.12] p-3 text-sm text-red-100">
                <p id="reset-confirm-title" className="font-bold">
                  Are you sure?
                </p>
                <p className="text-sm text-red-200/80">This cannot be undone. You will lose:</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-200">
                  <li>
                    <span className="num">{collectionSize}</span> cars from your collection
                  </li>
                  <li>All progress and packs opened</li>
                </ul>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button type="button" onClick={() => setConfirming(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button type="button" onClick={handleReset} className="btn btn-danger flex-1">
                  <Trash2 size={16} strokeWidth={2.6} /> Yes, Reset Everything
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="btn btn-danger mt-4 w-full sm:w-auto">
              <Trash2 size={16} strokeWidth={2.6} /> Reset Progress
            </button>
          )}
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-xs text-white/30">
        <p>Car Cards • All data is saved locally to your browser</p>
      </div>
    </div>
  )
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2.5">
        <Icon size={17} strokeWidth={2.4} className="text-gold-2" />
        <span className="headline text-xl">{title}</span>
        <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
      </h3>
      {children}
    </section>
  )
}

function Stat({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 sm:block sm:py-4">
      <div className="eyebrow">{label}</div>
      <div className={`num text-xl leading-tight sm:mt-1 sm:text-2xl ${accent ? 'text-gold-2' : ''}`}>{value}</div>
    </div>
  )
}

function Tier({ swatch, name, text }: { swatch: string; name: string; text: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <span aria-hidden className={`size-3.5 shrink-0 rotate-45 rounded-[3px] ${swatch}`} />
      <span>
        <span className="font-semibold text-white/80">{name}:</span> {text}
      </span>
    </li>
  )
}
