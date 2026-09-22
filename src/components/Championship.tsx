import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import {
  SEASONS,
  SEASON_BY_ID,
  YOU,
  driverName,
  fieldableRounds,
  gridOf,
  pointsFor,
  roundEvent,
  seasonBonus,
  standings,
  type RoundResult,
  type Season,
} from '../game/championships'
import { formatEuros } from '../game/economy'
import { ALL_CARDS } from '../game/pack'
import {
  DISCIPLINE_BLURB,
  DISCIPLINE_LABEL,
  DISCIPLINE_STATS,
  classOf,
  eligible,
  entryLine,
  payoutFor,
  statLabel,
  statValue,
} from '../game/race'
import { ownedCards, useGame, type SeasonState } from '../store/useGame'
import type { CardView } from '../types'

const CARD_BY_ID = new Map(ALL_CARDS.map((c) => [c.id, c]))

function carName(id: string): string {
  const card = CARD_BY_ID.get(id)
  return card ? `${card.make} ${card.model}` : id
}

function ordinal(n: number): string {
  return `P${n}`
}

export function Championship() {
  const season = useGame((s) => s.season)
  return season ? <SeasonRun state={season} /> : <SeasonPicker />
}

function SeasonPicker() {
  const collection = useGame((s) => s.collection)
  const titles = useGame((s) => s.seasonTitles)
  const startSeason = useGame((s) => s.startSeason)
  const garage = useMemo(() => ownedCards(collection), [collection])

  return (
    <div>
      <h2 className="mb-1 text-2xl font-extrabold tracking-tight">Championship</h2>
      <p className="mb-6 text-sm text-white/45">
        A season of rounds across every discipline, raced against the same rivals each time and
        scored on a points table. The catch: each car can start only one round, so you need a good
        car for every event, not just one great one.
      </p>

      <ul className="grid gap-3 sm:grid-cols-2">
        {SEASONS.map((season) => {
          const canField = fieldableRounds(season, garage)
          const won = titles[season.id] ?? 0
          return (
            <li
              key={season.id}
              className="flex flex-col rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="text-base font-extrabold">{season.name}</span>
                <span className="shrink-0 text-xs font-bold uppercase tracking-widest text-white/35">
                  {classOf(roundEvent(season, 0))}
                </span>
              </div>
              <p className="mb-3 text-xs text-white/45">
                {season.rounds.length} rounds · {gridOf(season)} cars ·{' '}
                {season.rounds.map((_, i) => DISCIPLINE_LABEL[roundEvent(season, i).discipline]).join(', ')}
              </p>
              <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className="text-white/55">
                  Champion takes{' '}
                  <span className="font-bold text-gold-2">{formatEuros(seasonBonus(season, 1))}</span>
                </span>
                <span className={canField === season.rounds.length ? 'text-white/55' : 'text-amber-300/80'}>
                  You can field a car in {canField} of {season.rounds.length} rounds
                </span>
                {won > 0 && <span className="font-bold text-gold-2">{won}× champion</span>}
              </div>
              <button
                type="button"
                disabled={canField === 0}
                onClick={() => startSeason(season.id)}
                className="mt-auto rounded-xl bg-gold-2 py-2 text-sm font-extrabold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Start season
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function SeasonRun({ state }: { state: SeasonState }) {
  const season = SEASON_BY_ID.get(state.seasonId)
  const closeSeason = useGame((s) => s.closeSeason)
  const [revealed, setRevealed] = useState<RoundResult | null>(null)
  const [forfeiting, setForfeiting] = useState(false)

  // A save can outlive a season definition. Offer the way out rather than crash.
  if (!season) {
    return (
      <button type="button" onClick={closeSeason} className="text-sm font-bold text-white/60 underline">
        This season no longer exists — clear it
      </button>
    )
  }

  const table = standings(season, state.rounds)
  const done = state.rounds.length
  const total = season.rounds.length

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="text-2xl font-extrabold tracking-tight">{season.name}</h2>
        {!state.final &&
          (forfeiting ? (
            <span className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={closeSeason}
                className="rounded-lg bg-red-500/80 px-3 py-1 text-xs font-bold hover:bg-red-500"
              >
                Forfeit — no title money
              </button>
              <button
                type="button"
                onClick={() => setForfeiting(false)}
                className="rounded-lg bg-white/10 px-3 py-1 text-xs font-bold hover:bg-white/20"
              >
                Keep racing
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setForfeiting(true)}
              className="shrink-0 text-xs font-bold uppercase tracking-widest text-white/35 hover:text-white/70"
            >
              Forfeit
            </button>
          ))}
      </div>
      <p className="mb-5 text-xs text-white/40">
        {state.final ? 'Season complete' : `Round ${done + 1} of ${total} · each car starts one round`}
      </p>

      <RoundStrip season={season} state={state} />

      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0">
          {revealed ? (
            <RoundResultView season={season} result={revealed} onContinue={() => setRevealed(null)} />
          ) : state.final ? (
            <SeasonSummary season={season} final={state.final} onClose={closeSeason} />
          ) : (
            <NextRound season={season} state={state} onResult={setRevealed} />
          )}
        </div>
        <StandingsTable season={season} table={table} />
      </div>
    </div>
  )
}

function RoundStrip({ season, state }: { season: Season; state: SeasonState }) {
  return (
    <ol className="mb-5 flex flex-wrap gap-2">
      {season.rounds.map((_, i) => {
        const event = roundEvent(season, i)
        const result = state.rounds[i]
        const current = !state.final && i === state.rounds.length
        return (
          <li
            key={event.id}
            className={`rounded-lg border px-3 py-1.5 text-xs ${
              current
                ? 'border-gold-2/60 bg-gold-2/[0.08] font-bold'
                : result
                  ? 'border-white/10 bg-white/[0.05] text-white/60'
                  : 'border-white/10 text-white/35'
            }`}
          >
            <span className="mr-1.5 tabular-nums text-white/35">{i + 1}</span>
            {DISCIPLINE_LABEL[event.discipline]}
            {result && (
              <span className="ml-1.5 font-bold text-white/80">
                {result.position ? ordinal(result.position) : 'DNS'}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function NextRound({
  season,
  state,
  onResult,
}: {
  season: Season
  state: SeasonState
  onResult: (result: RoundResult) => void
}) {
  const collection = useGame((s) => s.collection)
  const raceAnimationMs = useGame((s) => s.raceAnimationMs)
  const runSeasonRound = useGame((s) => s.runSeasonRound)
  const [running, setRunning] = useState<CardView | 'sitting-out' | null>(null)

  const round = state.rounds.length
  const event = roundEvent(season, round)
  const garage = useMemo(() => ownedCards(collection), [collection])
  const allowed = useMemo(() => new Set(eligible(event).map((c) => c.id)), [event])
  const mine = garage
    .filter((c) => allowed.has(c.id) && !state.used.includes(c.id))
    .sort((a, b) => b.overall - a.overall)
  const stillFieldable = fieldableRounds(season, garage, state.used, round)
  const remaining = season.rounds.length - round

  function go(car: CardView | null) {
    setRunning(car ?? 'sitting-out')
    // Run at the flag, not at the click, like an ordinary race, so the balance
    // in the header never gives the result away before it is shown.
    window.setTimeout(
      () => {
        const result = runSeasonRound(car?.id ?? null)
        setRunning(null)
        if (result) onResult(result)
      },
      car ? raceAnimationMs : 0,
    )
  }

  if (running) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm font-semibold text-white/50">
        {running === 'sitting-out' ? 'Sitting this one out…' : `Racing the ${running.make} ${running.model}…`}
      </p>
    )
  }

  return (
    <div>
      <h3 className="text-xl font-extrabold">{event.name}</h3>
      <p className="mb-1 text-sm text-white/55">{DISCIPLINE_BLURB[event.discipline]}</p>
      <p className="mb-4 text-xs text-white/40">
        Entry: {entryLine(event)} · Winner takes {formatEuros(payoutFor(event, 1))} and{' '}
        {pointsFor(1)} points
        {stillFieldable < remaining && (
          <span className="text-amber-300/80">
            {' '}
            · you can only field cars in {stillFieldable} of the {remaining} rounds left
          </span>
        )}
      </p>

      {mine.length === 0 ? (
        <p className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
          {state.used.length > 0
            ? 'Every car you own that can enter this round has already raced this season.'
            : 'Nothing in your garage can enter this round.'}
        </p>
      ) : (
        <ul className="mb-3 grid gap-2 sm:grid-cols-2">
          {mine.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => go(entry)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-gold-2/50 hover:bg-white/[0.06]"
              >
                <span className="w-8 shrink-0 text-lg font-black tabular-nums text-gold-2">
                  {entry.overall}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">
                    {entry.make} {entry.model}
                  </span>
                  <span className="flex flex-wrap gap-x-3 text-xs text-white/45">
                    {DISCIPLINE_STATS[event.discipline].map((stat) => (
                      <span key={stat} className="tabular-nums">
                        {statValue(entry, stat)} <span className="text-white/30">{statLabel(stat)}</span>
                      </span>
                    ))}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Sitting a round out is a real choice, not only a dead end: it saves
          a car for a later round where it matters more. */}
      <button
        type="button"
        onClick={() => go(null)}
        className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold transition hover:bg-white/20"
      >
        Sit this round out — score nothing
      </button>

      {state.used.length > 0 && (
        <p className="mt-4 text-xs text-white/35">
          Already raced this season: {state.used.map(carName).join(', ')}
        </p>
      )}
    </div>
  )
}

function RoundResultView({
  season,
  result,
  onContinue,
}: {
  season: Season
  result: RoundResult
  onContinue: () => void
}) {
  const event = roundEvent(season, season.rounds.indexOf(result.eventId))
  return (
    <div>
      <h3 className="mb-1 text-xl font-extrabold">{event.name}</h3>
      <div className="mb-4 flex items-baseline gap-3">
        <span className="text-4xl font-black tabular-nums">
          {result.position ? ordinal(result.position) : 'DNS'}
        </span>
        {result.position && (
          <span className="text-lg font-extrabold text-white/70">+{pointsFor(result.position)} pts</span>
        )}
        {result.payout > 0 && (
          <span className="text-2xl font-extrabold text-gold-2">+{formatEuros(result.payout)}</span>
        )}
      </div>

      <ol className="mb-5 space-y-1">
        <AnimatePresence initial={false}>
          {result.order.map((entry, i) => (
            <motion.li
              key={entry.driver}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                entry.driver === YOU
                  ? 'border-gold-2/60 bg-gold-2/[0.08] font-bold'
                  : 'border-white/10 bg-white/[0.03] text-white/60'
              }`}
            >
              <span className="w-5 shrink-0 tabular-nums text-white/40">{i + 1}</span>
              <span className="w-32 shrink-0 truncate">{driverName(season, entry.driver)}</span>
              <span className="min-w-0 flex-1 truncate text-white/45">{carName(entry.carId)}</span>
              <span className="shrink-0 tabular-nums text-white/40">+{pointsFor(i + 1)}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>

      <button
        type="button"
        onClick={onContinue}
        className="w-full rounded-xl bg-gold-2 py-2.5 text-sm font-extrabold text-black transition hover:brightness-110"
      >
        Continue
      </button>
    </div>
  )
}

function SeasonSummary({
  season,
  final,
  onClose,
}: {
  season: Season
  final: NonNullable<SeasonState['final']>
  onClose: () => void
}) {
  const headline =
    final.position === 1
      ? `${season.name} champion`
      : final.position <= 3
        ? `${ordinal(final.position)} in the championship`
        : `Finished ${ordinal(final.position)}`
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <p className="mb-1 text-xs font-bold uppercase tracking-widest text-white/35">Final standings</p>
      <h3 className={`mb-2 text-2xl font-black ${final.position === 1 ? 'text-gold-2' : ''}`}>{headline}</h3>
      <p className="mb-5 text-sm text-white/55">
        {final.bonus > 0
          ? `Title money: ${formatEuros(final.bonus)}, on top of what each round paid.`
          : 'No title money outside the top three — the round winnings are yours to keep.'}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-xl bg-gold-2 py-2.5 text-sm font-extrabold text-black transition hover:brightness-110"
      >
        Finish season
      </button>
    </div>
  )
}

function StandingsTable({ season, table }: { season: Season; table: ReturnType<typeof standings> }) {
  return (
    <div className="self-start rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-white/35">Standings</p>
      <ol className="space-y-0.5">
        {table.map((row, i) => (
          <li
            key={row.driver}
            className={`flex items-center gap-2 rounded-md px-2 py-1 text-sm ${
              row.driver === YOU ? 'bg-gold-2/[0.1] font-bold' : 'text-white/65'
            }`}
          >
            <span className="w-4 shrink-0 tabular-nums text-white/35">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate">{driverName(season, row.driver)}</span>
            {row.wins > 0 && <span className="shrink-0 text-xs tabular-nums text-white/35">{row.wins}W</span>}
            <span className="w-8 shrink-0 text-right font-bold tabular-nums">{row.points}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
