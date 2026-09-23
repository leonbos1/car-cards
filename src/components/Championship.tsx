import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  CarFront,
  ChevronRight,
  Gauge,
  Lock,
  Mountain,
  Route,
  Sparkles,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
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
  type Discipline,
  type RaceEvent,
} from '../game/race'
import { ownedCards, useGame, type SeasonState } from '../store/useGame'
import type { CardView } from '../types'
import { PageHeader } from './ui/PageHeader'

const CARD_BY_ID = new Map(ALL_CARDS.map((c) => [c.id, c]))

function carName(id: string): string {
  const card = CARD_BY_ID.get(id)
  return card ? `${card.make} ${card.model}` : id
}

function ordinal(n: number): string {
  return `P${n}`
}

/* ---- Race-screen parts ------------------------------------------------
 * Shared by the event screens in Race.tsx and the season screens here, so a
 * round of a championship looks like the same kind of race as a one-off.
 * Race.tsx imports them from this file rather than the other way round so
 * the two files never import each other.
 */

/** What each discipline looks like at a glance. */
const DISCIPLINE_ICON: Record<Discipline, LucideIcon> = {
  drag: Zap,
  circuit: Route,
  topspeed: Gauge,
  concours: Sparkles,
  offroad: Mountain,
}

/**
 * Classes read like a licence ladder: bronze, silver, gold, then the special
 * tier's pink for Elite. Open events have no rating band at all, so they get
 * a colour outside the ladder.
 */
const CLASS_ACCENT: Record<string, string> = {
  Rookie: 'var(--color-bronze-2)',
  Club: 'var(--color-silver-2)',
  National: 'var(--color-gold-2)',
  Elite: '#f59ce0',
  Open: '#6cc7ff',
}

/** Sets `--cls` for everything inside, so `bg-(--cls)` and friends follow the class. */
export function classStyle(cls: string): CSSProperties {
  return { '--cls': CLASS_ACCENT[cls] ?? 'var(--color-silver-2)' } as CSSProperties
}

/** The colour a finishing position earns: the podium in medal colours. */
export function positionTone(position: number | null): string {
  if (position === 1) return 'text-gold-2'
  if (position === 2) return 'text-silver-2'
  if (position === 3) return 'text-bronze-2'
  return 'text-white/85'
}

/** A slanted class label in the class colour. Sets `--cls` itself. */
export function ClassTag({ cls, className = '' }: { cls: string; className?: string }) {
  return (
    <span style={classStyle(cls)} className={`tag bg-(--cls) text-pitch ${className}`}>
      {cls}
    </span>
  )
}

/** The discipline icon in a slanted plate, tinted by the surrounding `--cls`. */
export function DisciplineBadge({
  discipline,
  locked = false,
  size = 'md',
}: {
  discipline: Discipline
  locked?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const Icon = locked ? Lock : DISCIPLINE_ICON[discipline]
  const box = size === 'lg' ? 'h-14 w-16' : size === 'sm' ? 'h-8 w-9' : 'h-11 w-12'
  const icon = size === 'lg' ? 28 : size === 'sm' ? 16 : 22
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center ${box} ${
        locked ? 'bg-white/[0.06] text-white/40' : 'bg-(--cls)/15 text-(--cls)'
      }`}
      style={{ clipPath: 'polygon(18% 0, 100% 0, 82% 100%, 0 100%)' }}
    >
      <Icon size={icon} strokeWidth={2.3} />
    </span>
  )
}

/** A small discipline icon with its name, for rows and calendars. */
export function DisciplineLabel({ discipline, className = '' }: { discipline: Discipline; className?: string }) {
  const Icon = DISCIPLINE_ICON[discipline]
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Icon size={14} strokeWidth={2.4} aria-hidden className="shrink-0" />
      {DISCIPLINE_LABEL[discipline]}
    </span>
  )
}

/** "All events", "Change round": the way back out of a sub-screen. */
export function BackButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-1 mb-2 inline-flex min-h-11 items-center gap-1.5 px-1 font-display text-sm font-bold uppercase tracking-widest text-white/50 transition hover:text-white"
    >
      <ArrowLeft size={16} strokeWidth={2.4} aria-hidden />
      {children}
    </button>
  )
}

/** A strip of labelled figures: the race brief, a season's numbers. */
export function StatStrip({ items }: { items: { label: string; value: ReactNode; wide?: boolean }[] }) {
  return (
    <dl className="panel grid grid-cols-2 divide-white/[0.06] overflow-hidden sm:flex sm:divide-x">
      {items.map((item) => (
        <div
          key={item.label}
          className={`min-w-0 border-white/[0.06] px-4 py-3 max-sm:border-b sm:flex-1 ${
            item.wide ? 'col-span-2' : 'max-sm:odd:border-r'
          }`}
        >
          <dt className="eyebrow mb-1">{item.label}</dt>
          <dd className="text-sm font-semibold text-white/85">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * The cars you can enter, with the numbers the event is decided on — the ones
 * that matter first, in gold — rather than a wall of every stat.
 */
export function CarPickList({
  event,
  cars,
  onPick,
}: {
  event: RaceEvent
  cars: CardView[]
  onPick: (car: CardView) => void
}) {
  const stats = DISCIPLINE_STATS[event.discipline]
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="eyebrow">Judged on</span>
        {stats.map((stat, i) => (
          <span
            key={stat}
            className={`font-display text-sm font-bold uppercase tracking-wide ${
              i === 0 ? 'text-gold-2' : 'text-white/55'
            }`}
          >
            {statLabel(stat)}
          </span>
        ))}
        <span className="text-xs text-white/35">heaviest first</span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {cars.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              data-car
              onClick={() => onPick(entry)}
              className="panel panel-interactive group flex min-h-16 w-full items-center gap-3 p-2.5 pr-3 text-left"
            >
              <span
                className="num grid h-11 w-11 shrink-0 place-items-center bg-white/[0.06] text-xl text-white"
                style={{ clipPath: 'polygon(14% 0, 100% 0, 86% 100%, 0 100%)' }}
                aria-label={`Rated ${entry.overall}`}
              >
                {entry.overall}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold leading-tight">
                  {entry.make} {entry.model}
                </span>
                {/* The numbers this event is decided on, not the rating —
                    a 92 that weighs two tonnes loses a circuit race. */}
                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  {stats.map((stat, i) => (
                    <span key={stat} className="whitespace-nowrap">
                      <span className={`num text-base ${i === 0 ? 'text-gold-2' : 'text-white/85'}`}>
                        {statValue(entry, stat)}
                      </span>{' '}
                      <span className="text-xs text-white/40">{statLabel(stat)}</span>
                    </span>
                  ))}
                </span>
              </span>
              <ChevronRight
                size={20}
                aria-hidden
                className="shrink-0 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-gold-2"
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** A panel with nothing to pick in it, and why. */
export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="panel flex items-start gap-3 p-4 text-sm text-white/55">
      <CarFront size={20} aria-hidden className="mt-0.5 shrink-0 text-white/30" />
      {children}
    </p>
  )
}

/**
 * The wait while a race runs: a live tag, the car, and a track bar that fills
 * over exactly as long as the race takes, so the wait reads as the race.
 */
export function RacingWait({ label, car, durationMs }: { label: string; car?: string; durationMs: number }) {
  const reduce = useReducedMotion()
  return (
    <div className="panel-cut relative overflow-hidden p-5 sm:p-7" role="status" aria-live="polite">
      <div className="mb-3 flex items-center gap-2">
        <span className="tag animate-pulse-soft bg-signal text-white">Live</span>
        <span className="eyebrow">Lights out</span>
      </div>
      <p className="headline text-4xl sm:text-5xl">{label}</p>
      {car && <p className="mt-1.5 truncate text-sm text-white/55">{car}</p>}
      <div className="relative mt-6 h-2.5 overflow-hidden bg-white/[0.07]" aria-hidden>
        {/* Sector marks, so the bar reads as a lap rather than a loading bar. */}
        <span className="absolute inset-y-0 left-1/3 w-px bg-white/15" />
        <span className="absolute inset-y-0 left-2/3 w-px bg-white/15" />
        {reduce ? (
          <span className="absolute inset-0 animate-pulse-soft bg-gold-2/40" />
        ) : (
          <motion.span
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold-1 via-gold-2 to-gold-3 shadow-[0_0_14px_rgb(232_194_90/0.7)]"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: durationMs / 1000, ease: 'linear' }}
          />
        )}
      </div>
      <div className="mt-1.5 flex justify-between font-display text-xs font-bold uppercase tracking-widest text-white/30">
        <span>S1</span>
        <span>S2</span>
        <span>S3</span>
        <span>Flag</span>
      </div>
    </div>
  )
}

/** The big finishing position, landing with a thump. */
export function BigPosition({ position, of }: { position: number | null; of: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { scale: 1.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      className="flex items-end gap-2"
    >
      <span
        className={`headline text-7xl leading-[0.85] sm:text-8xl ${positionTone(position)} ${
          position === 1 ? 'drop-shadow-[0_0_24px_rgb(232_194_90/0.55)]' : ''
        }`}
      >
        {position ? ordinal(position) : 'DNS'}
      </span>
      {position !== null && <span className="num mb-1 text-xl text-white/35">/{of}</span>}
    </motion.div>
  )
}

/* ---- Championship ----------------------------------------------------- */

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
      <PageHeader
        eyebrow="Season mode"
        title="Championship"
        subtitle="A season of rounds across every discipline, raced against the same rivals each time and scored on a points table. The catch: each car can start only one round, so you need a good car for every event, not just one great one."
      />

      <ul className="grid gap-3 md:grid-cols-2">
        {SEASONS.map((season) => {
          const canField = fieldableRounds(season, garage)
          const won = titles[season.id] ?? 0
          const cls = classOf(roundEvent(season, 0))
          const total = season.rounds.length
          const short = canField < total
          return (
            <li
              key={season.id}
              style={classStyle(cls)}
              className={`panel relative flex flex-col overflow-hidden ${canField === 0 ? 'opacity-60' : ''}`}
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-(--cls) to-transparent" />
              <div className="flex flex-1 flex-col p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <ClassTag cls={cls} />
                  {won > 0 && (
                    <span className="inline-flex items-center gap-1 font-display text-sm font-bold uppercase tracking-wide text-gold-2">
                      <Trophy size={15} strokeWidth={2.4} aria-hidden />
                      {won}× champion
                    </span>
                  )}
                </div>
                <h3 className="headline text-3xl">{season.name}</h3>
                <p className="mt-1 text-sm text-white/50">
                  {total} rounds · {gridOf(season)} cars
                </p>

                {/* The season's calendar, in running order. */}
                <ol
                  className="my-4 grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
                  aria-label="Rounds"
                >
                  {season.rounds.map((id, i) => {
                    const event = roundEvent(season, i)
                    const Icon = DISCIPLINE_ICON[event.discipline]
                    return (
                      <li
                        key={id}
                        className="flex min-w-0 flex-col items-center gap-1 bg-white/[0.04] px-1 py-2 text-center first:rounded-l-md last:rounded-r-md"
                      >
                        <Icon size={18} strokeWidth={2.3} aria-hidden className="text-(--cls)" />
                        <span className="w-full truncate font-display text-xs font-semibold text-white/60">
                          {DISCIPLINE_LABEL[event.discipline]}
                        </span>
                      </li>
                    )
                  })}
                </ol>

                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow mb-0.5">Champion takes</p>
                    <p className="num text-3xl leading-none text-gold-2">{formatEuros(seasonBonus(season, 1))}</p>
                  </div>
                  <div className="min-w-0 text-right">
                    <div className="mb-1.5 flex justify-end gap-1" aria-hidden>
                      {season.rounds.map((id, i) => (
                        <span
                          key={id}
                          className={`h-1.5 w-4 -skew-x-[20deg] ${
                            i < canField ? (short ? 'bg-amber-300/80' : 'bg-go') : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs ${short ? 'text-amber-300/85' : 'text-white/55'}`}>
                      You can field a car in {canField} of {total} rounds
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={canField === 0}
                  onClick={() => startSeason(season.id)}
                  className="btn btn-secondary mt-auto w-full"
                >
                  {canField === 0 ? (
                    <>
                      <Lock size={16} aria-hidden /> Start season
                    </>
                  ) : (
                    <>
                      Start season <ChevronRight size={18} aria-hidden />
                    </>
                  )}
                </button>
              </div>
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
      <button type="button" onClick={closeSeason} className="btn btn-secondary">
        This season no longer exists — clear it
      </button>
    )
  }

  const table = standings(season, state.rounds)
  const done = state.rounds.length
  const total = season.rounds.length
  const cls = classOf(roundEvent(season, 0))

  return (
    <div style={classStyle(cls)}>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <ClassTag cls={cls} />
            {state.final ? 'Final' : <span className="text-signal">Season live</span>}
          </span>
        }
        title={season.name}
        subtitle={state.final ? 'Season complete' : `Round ${done + 1} of ${total} · each car starts one round`}
      />

      <div className="mb-2 flex min-h-11 flex-wrap items-center justify-between gap-2">
        <span className="eyebrow">Calendar</span>
        {!state.final &&
          (forfeiting ? (
            <span className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={closeSeason} className="btn btn-danger btn-sm">
                Forfeit — no title money
              </button>
              <button type="button" onClick={() => setForfeiting(false)} className="btn btn-secondary btn-sm">
                Keep racing
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setForfeiting(true)}
              className="-mr-2 inline-flex min-h-11 items-center px-2 font-display text-sm font-bold uppercase tracking-widest text-white/40 transition hover:text-signal"
            >
              Forfeit
            </button>
          ))}
      </div>

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
        <StandingsTable season={season} table={table} after={done} />
      </div>
    </div>
  )
}

/** The season calendar: every round, what it is, and how it went. */
function RoundStrip({ season, state }: { season: Season; state: SeasonState }) {
  return (
    <ol
      className="mb-6 grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${season.rounds.length}, minmax(0, 1fr))` }}
      aria-label="Season calendar"
    >
      {season.rounds.map((_, i) => {
        const event = roundEvent(season, i)
        const result = state.rounds[i]
        const current = !state.final && i === state.rounds.length
        const Icon = DISCIPLINE_ICON[event.discipline]
        return (
          <li
            key={event.id}
            aria-current={current ? 'step' : undefined}
            className={`relative flex min-w-0 flex-col items-center gap-1 overflow-hidden rounded-lg border px-1 pb-2 pt-1.5 text-center ${
              current
                ? 'border-gold-2/70 bg-gold-2/[0.1] shadow-[0_0_18px_rgb(232_194_90/0.25)]'
                : result
                  ? 'border-white/10 bg-white/[0.05]'
                  : 'border-dashed border-white/10'
            }`}
          >
            <span className={`font-display text-xs font-bold uppercase tracking-widest ${current ? 'text-gold-2' : 'text-white/35'}`}>
              R{i + 1}
            </span>
            <Icon
              size={22}
              strokeWidth={2.3}
              aria-hidden
              className={current ? 'text-gold-2' : result ? 'text-white/70' : 'text-white/30'}
            />
            <span className={`w-full truncate font-display text-xs font-semibold sm:text-sm ${result || current ? 'text-white/70' : 'text-white/35'}`}>
              {DISCIPLINE_LABEL[event.discipline]}
            </span>
            {result ? (
              <span className={`num text-lg leading-none sm:text-2xl ${result.position ? positionTone(result.position) : 'text-white/40'}`}>
                {result.position ? ordinal(result.position) : 'DNS'}
              </span>
            ) : current ? (
              <span className="tag">Next</span>
            ) : (
              <span className="num text-lg leading-none text-white/15 sm:text-2xl">—</span>
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
    return running === 'sitting-out' ? (
      <RacingWait label="Sitting this one out…" durationMs={0} />
    ) : (
      <RacingWait
        label="Racing…"
        car={`Racing the ${running.make} ${running.model}…`}
        durationMs={raceAnimationMs}
      />
    )
  }

  return (
    <div>
      <section className="panel-cut mb-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <DisciplineBadge discipline={event.discipline} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="eyebrow mb-1">
              Round {round + 1} of {season.rounds.length} · {DISCIPLINE_LABEL[event.discipline]}
            </p>
            <h3 className="headline text-3xl">{event.name}</h3>
          </div>
        </div>
        <p className="mt-3 text-sm text-white/60">{DISCIPLINE_BLURB[event.discipline]}</p>
      </section>

      <div className="mb-4">
        <StatStrip
          items={[
            { label: 'Entry', value: entryLine(event), wide: true },
            {
              label: 'Winner takes',
              value: <span className="num text-lg text-gold-2">{formatEuros(payoutFor(event, 1))}</span>,
            },
            { label: 'And', value: <span className="num text-lg">{pointsFor(1)} points</span> },
          ]}
        />
        {stillFieldable < remaining && (
          <p className="mt-2 flex items-start gap-2 rounded-lg border border-amber-300/25 bg-amber-300/[0.06] px-3 py-2 text-sm text-amber-200/90">
            <AlertTriangle size={16} aria-hidden className="mt-0.5 shrink-0" />
            You can only field cars in {stillFieldable} of the {remaining} rounds left
          </p>
        )}
      </div>

      {mine.length === 0 ? (
        <div className="mb-3">
          <EmptyNote>
            {state.used.length > 0
              ? 'Every car you own that can enter this round has already raced this season.'
              : 'Nothing in your garage can enter this round.'}
          </EmptyNote>
        </div>
      ) : (
        <div className="mb-4">
          <CarPickList event={event} cars={mine} onPick={go} />
        </div>
      )}

      {/* Sitting a round out is a real choice, not only a dead end: it saves
          a car for a later round where it matters more. */}
      <button type="button" onClick={() => go(null)} className="btn btn-secondary btn-sm w-full sm:w-auto">
        Sit this round out — score nothing
      </button>

      {state.used.length > 0 && (
        <div className="mt-5">
          <p className="eyebrow mb-2">Already raced this season</p>
          <ul className="flex flex-wrap gap-1.5">
            {state.used.map((id) => (
              <li key={id} className="rounded-md bg-white/[0.05] px-2 py-1 text-xs text-white/55 line-through decoration-white/25">
                {carName(id)}
              </li>
            ))}
          </ul>
        </div>
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
  const reduce = useReducedMotion()
  return (
    <div>
      <section className="panel-cut mb-4 p-5">
        <p className="eyebrow mb-2">
          <DisciplineLabel discipline={event.discipline} /> · {event.name}
        </p>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <BigPosition position={result.position} of={result.order.length} />
          <div className="mb-1 flex items-baseline gap-4">
            {result.position && (
              <span className="num text-2xl text-white/80">+{pointsFor(result.position)} pts</span>
            )}
            {result.payout > 0 && <span className="num text-3xl text-gold-2">+{formatEuros(result.payout)}</span>}
          </div>
        </div>
      </section>

      <ol className="mb-5 space-y-1">
        <AnimatePresence>
          {result.order.map((entry, i) => {
            const you = entry.driver === YOU
            return (
              <motion.li
                key={entry.driver}
                initial={reduce ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex min-h-12 items-center gap-3 rounded-lg border px-2 py-1.5 ${
                  you ? 'border-gold-2/60 bg-gold-2/[0.08]' : 'border-white/[0.07] bg-white/[0.03]'
                }`}
              >
                <PositionCell position={i + 1} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-bold ${you ? 'text-gold-2' : 'text-white/85'}`}>
                    {driverName(season, entry.driver)}
                  </span>
                  <span className="block truncate text-xs text-white/45">{carName(entry.carId)}</span>
                </span>
                <span className="num shrink-0 text-base text-white/55">+{pointsFor(i + 1)}</span>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ol>

      <button type="button" onClick={onContinue} className="btn btn-primary btn-lg w-full">
        Continue
      </button>
    </div>
  )
}

/** A timing-tower position block: the podium in medal colours. */
export function PositionCell({ position }: { position: number }) {
  const podium =
    position === 1
      ? 'bg-gold-2 text-pitch'
      : position === 2
        ? 'bg-silver-2 text-pitch'
        : position === 3
          ? 'bg-bronze-2 text-pitch'
          : 'bg-white/[0.07] text-white/60'
  return (
    <span
      className={`num grid h-8 w-9 shrink-0 place-items-center text-base ${podium}`}
      style={{ clipPath: 'polygon(20% 0, 100% 0, 80% 100%, 0 100%)' }}
    >
      {position}
    </span>
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
  const reduce = useReducedMotion()
  return (
    <div className="panel-cut relative overflow-hidden p-5 sm:p-7">
      {final.position === 1 && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-gold-2/20 blur-3xl"
        />
      )}
      <p className="eyebrow mb-3">Final standings</p>
      <motion.div
        initial={reduce ? false : { scale: 1.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        className="mb-3 flex items-center gap-4"
      >
        <span
          className={`grid size-16 shrink-0 place-items-center rounded-full border-2 ${
            final.position <= 3 ? 'border-current' : 'border-white/15'
          } ${positionTone(final.position)}`}
        >
          {final.position <= 3 ? (
            <Trophy size={30} strokeWidth={2.2} aria-hidden />
          ) : (
            <span className="num text-2xl">{ordinal(final.position)}</span>
          )}
        </span>
        <h3 className={`headline text-4xl ${final.position === 1 ? 'text-gold-2' : ''}`}>{headline}</h3>
      </motion.div>
      {final.bonus > 0 && (
        <p className="num mb-1 text-4xl text-gold-2">+{formatEuros(final.bonus)}</p>
      )}
      <p className="mb-6 text-sm text-white/60">
        {final.bonus > 0
          ? `Title money: ${formatEuros(final.bonus)}, on top of what each round paid.`
          : 'No title money outside the top three — the round winnings are yours to keep.'}
      </p>
      <button type="button" onClick={onClose} className="btn btn-primary btn-lg w-full">
        Finish season
      </button>
    </div>
  )
}

/** The points table, drawn as a broadcast timing tower. */
function StandingsTable({
  season,
  table,
  after,
}: {
  season: Season
  table: ReturnType<typeof standings>
  after: number
}) {
  const leader = table[0]?.points ?? 0
  return (
    <div className="panel self-start overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-black/30 px-3 py-2.5">
        <span className="headline text-lg">Standings</span>
        <span className="eyebrow">{after === 0 ? 'Before round 1' : `After R${after}`}</span>
      </div>
      <ol className="divide-y divide-white/[0.05]">
        {table.map((row, i) => {
          const you = row.driver === YOU
          return (
            <li
              key={row.driver}
              className={`relative flex min-h-11 items-center gap-2.5 px-2 py-1.5 ${you ? 'bg-gold-2/[0.1]' : ''}`}
            >
              {you && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-gold-2" />}
              <PositionCell position={i + 1} />
              <span className={`min-w-0 flex-1 truncate text-sm ${you ? 'font-bold text-gold-2' : 'font-semibold text-white/80'}`}>
                {driverName(season, row.driver)}
              </span>
              {row.wins > 0 && (
                <span className="shrink-0 font-display text-xs font-bold uppercase tracking-wide text-white/40">
                  {row.wins}W
                </span>
              )}
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-white/30">
                {i === 0 || leader === row.points ? '' : `−${leader - row.points}`}
              </span>
              <span className="num w-9 shrink-0 text-right text-lg">{row.points}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
