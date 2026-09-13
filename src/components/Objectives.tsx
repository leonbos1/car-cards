import { motion } from 'framer-motion'
import { formatEuros } from '../game/economy'
import { TOTAL_OBJECTIVE_REWARD, objectiveProgress } from '../game/objectives'
import { ownedCards, useGame } from '../store/useGame'

export function Objectives() {
  const collection = useGame((s) => s.collection)
  const packsOpened = useGame((s) => s.packsOpened)
  const claimedObjectives = useGame((s) => s.claimedObjectives)
  const claimObjective = useGame((s) => s.claimObjective)

  const rows = objectiveProgress(
    { owned: ownedCards(collection), packsOpened },
    claimedObjectives,
  )

  const claimable = rows.filter((r) => r.complete && !r.claimed)
  const collected = rows
    .filter((r) => r.claimed)
    .reduce((sum, r) => sum + r.objective.reward, 0)

  // Unclaimed rewards first — they are money sitting on the table.
  const ordered = [...rows].sort((a, b) => {
    const rank = (r: (typeof rows)[number]) => (r.complete && !r.claimed ? 0 : r.claimed ? 2 : 1)
    return rank(a) - rank(b)
  })

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-6">
      <h2 className="mb-1 text-2xl font-extrabold tracking-tight">Objectives</h2>
      <p className="mb-5 text-sm text-white/45">
        Packs always cost more than their cars sell for, so this is where the money comes from.
        {claimable.length > 0 && (
          <span className="ml-1 font-semibold text-gold-2">
            {claimable.length} ready to collect.
          </span>
        )}
      </p>

      <div className="mb-6 flex flex-wrap gap-3">
        <Stat label="Collected" value={formatEuros(collected)} />
        <Stat label="Still available" value={formatEuros(TOTAL_OBJECTIVE_REWARD - collected)} />
      </div>

      <ul className="space-y-2">
        {ordered.map(({ objective, current, complete, claimed }) => {
          const pct = Math.round((current / objective.target) * 100)
          return (
            <li
              key={objective.id}
              className={`rounded-xl border p-3 ${
                claimed
                  ? 'border-white/5 bg-white/[0.02] opacity-50'
                  : complete
                    ? 'border-gold-2/50 bg-gold-2/[0.07]'
                    : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{objective.name}</div>
                  <div className="text-xs text-white/50">{objective.detail}</div>
                </div>

                {claimed ? (
                  <span className="text-xs font-bold uppercase tracking-widest text-white/35">
                    Collected
                  </span>
                ) : complete ? (
                  <button
                    type="button"
                    onClick={() => claimObjective(objective.id)}
                    className="rounded-lg bg-gold-2 px-3 py-1.5 text-xs font-extrabold text-black transition hover:brightness-110"
                  >
                    Collect {formatEuros(objective.reward)}
                  </button>
                ) : (
                  <span className="text-xs font-bold tabular-nums text-white/60">
                    {formatEuros(objective.reward)}
                  </span>
                )}
              </div>

              {!claimed && !complete && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gold-2/70"
                      initial={false}
                      animate={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[11px] tabular-nums text-white/40">
                    {current} / {objective.target}
                  </span>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-4 py-2.5">
      <div className="text-[11px] font-bold uppercase tracking-widest text-white/40">{label}</div>
      <div className="mt-0.5 text-lg font-extrabold tabular-nums">{value}</div>
    </div>
  )
}
