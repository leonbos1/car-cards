import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { formatEuros } from '../game/economy'
import {
  DISCIPLINE_BLURB,
  DISCIPLINE_LABEL,
  DISCIPLINE_STATS,
  EVENTS,
  classOf,
  eligible,
  entryLine,
  payoutFor,
  race,
  statLabel,
  statValue,
  withOverrides,
  type RaceEvent,
  type RaceResult,
} from '../game/race'
import { ownedCards, useGame } from '../store/useGame'
import type { CardView } from '../types'
import { Championship } from './Championship'

const CLASS_ORDER = ['Rookie', 'Club', 'National', 'Elite', 'Open']

export function Race() {
  const collection = useGame((s) => s.collection)
  const finishRace = useGame((s) => s.finishRace)
  const raceAnimationMs = useGame((s) => s.raceAnimationMs)
  const cardOverrides = useGame((s) => s.cardOverrides)
  const seasonActive = useGame((s) => s.season !== null)

  const [mode, setMode] = useState<'events' | 'championship'>(seasonActive ? 'championship' : 'events')
  const [event, setEvent] = useState<RaceEvent | null>(null)
  const [car, setCar] = useState<CardView | null>(null)
  const [result, setResult] = useState<RaceResult | null>(null)
  const [running, setRunning] = useState(false)
  // A session tally, because the whole point of a grind is watching it add up.
  const [session, setSession] = useState({ races: 0, earned: 0 })

  const garage = useMemo(() => ownedCards(collection), [collection])

  function start(entry: CardView, on: RaceEvent) {
    setCar(entry)
    setResult(null)
    setRunning(true)
    const outcome = race(withOverrides(entry, cardOverrides[entry.id]), on)

    // Banked at the flag, not at the click, so the money and the result you are
    // looking at are always the same race.
    window.setTimeout(() => {
      setResult(outcome)
      setRunning(false)
      finishRace(outcome.payout, outcome.position === 1)
      setSession((s) => ({ races: s.races + 1, earned: s.earned + outcome.payout }))
    }, raceAnimationMs)
  }

  if (mode === 'championship') {
    return (
      <Shell>
        <ModeToggle mode={mode} onChange={setMode} />
        <Championship />
      </Shell>
    )
  }

  if (event && car && (running || result)) {
    return (
      <Shell>
        <RaceRun
          event={event}
          result={result}
          onAgain={() => start(car, event)}
          onChangeCar={() => {
            setResult(null)
            setCar(null)
          }}
          onBack={() => {
            setResult(null)
            setCar(null)
            setEvent(null)
          }}
          session={session}
        />
      </Shell>
    )
  }

  if (event) {
    const allowed = new Set(eligible(event).map((c) => c.id))
    const mine = garage
      .filter((c) => allowed.has(c.id))
      .sort((a, b) => b.overall - a.overall)
    return (
      <Shell>
        <button
          type="button"
          onClick={() => setEvent(null)}
          className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white/80"
        >
          ← All events
        </button>
        <h3 className="text-xl font-extrabold">{event.name}</h3>
        <p className="mb-1 text-sm text-white/55">{DISCIPLINE_BLURB[event.discipline]}</p>
        <p className="mb-5 text-xs text-white/40">
          Entry: {entryLine(event)} · Winner takes {formatEuros(payoutFor(event, 1))} · Last place
          still pays {formatEuros(payoutFor(event, event.grid))}
        </p>

        {mine.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
            Nothing in your garage can enter this one. Come back when you own a car that fits.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {mine.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => start(entry, event)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-gold-2/50 hover:bg-white/[0.06]"
                >
                  <span className="w-8 shrink-0 text-lg font-black tabular-nums text-gold-2">
                    {entry.overall}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {entry.make} {entry.model}
                    </span>
                    {/* The numbers this event is decided on, not the rating —
                        a 92 that weighs two tonnes loses a circuit race. */}
                    <span className="flex flex-wrap gap-x-3 text-xs text-white/45">
                      {DISCIPLINE_STATS[event.discipline].map((stat) => (
                        <span key={stat} className="tabular-nums">
                          {statValue(entry, stat)}{' '}
                          <span className="text-white/30">{statLabel(stat)}</span>
                        </span>
                      ))}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Shell>
    )
  }

  return (
    <Shell>
      <ModeToggle mode={mode} onChange={setMode} />
      <h2 className="mb-1 text-2xl font-extrabold tracking-tight">Race</h2>
      <p className="mb-6 text-sm text-white/45">
        No timers and no limit — race as often as you like. What you earn depends on bringing the
        right car: a drag strip and a concours lawn want completely different things, and a
        well-matched entry pays around ten times a lazy one.
      </p>

      {CLASS_ORDER.map((cls) => {
        const events = EVENTS.filter((e) => classOf(e) === cls)
        if (!events.length) return null
        return (
          <section key={cls} className="mb-6">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-white/35">
              {cls} — {entryLine(events[0])}
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {events.map((e) => {
                const allowed = new Set(eligible(e).map((c) => c.id))
                const ready = garage.filter((c) => allowed.has(c.id)).length
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      disabled={ready === 0}
                      onClick={() => setEvent(e)}
                      className={`flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition ${
                        ready ? 'hover:border-gold-2/50 hover:bg-white/[0.06]' : 'opacity-40'
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{e.name}</span>
                        <span className="block text-xs text-white/45">
                          {DISCIPLINE_LABEL[e.discipline]} ·{' '}
                          {ready ? `${ready} of your cars can enter` : 'no car of yours fits'}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-xs font-extrabold tabular-nums text-gold-2">
                        {formatEuros(payoutFor(e, 1))}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </Shell>
  )
}

function RaceRun({
  event,
  result,
  session,
  onAgain,
  onChangeCar,
  onBack,
}: {
  event: RaceEvent
  result: RaceResult | null
  session: { races: number; earned: number }
  onAgain: () => void
  onChangeCar: () => void
  onBack: () => void
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white/80"
      >
        ← All events
      </button>
      <h3 className="text-xl font-extrabold">{event.name}</h3>
      <p className="mb-5 text-xs text-white/40">
        {DISCIPLINE_LABEL[event.discipline]} · {session.races}{' '}
        {session.races === 1 ? 'race' : 'races'} this session · {formatEuros(session.earned)} earned
      </p>

      {result ? (
        <Finished result={result} onAgain={onAgain} onChangeCar={onChangeCar} />
      ) : (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm font-semibold text-white/50">
          Racing…
        </p>
      )}
    </div>
  )
}

function Finished({
  result,
  onAgain,
  onChangeCar,
}: {
  result: RaceResult
  onAgain: () => void
  onChangeCar: () => void
}) {
  // Fitness scores bunch up between about 0.5 and 0.9, so drawing each bar as
  // a fraction of the winner's makes every race look like a dead heat. Stretch
  // the field across the row instead: the winner fills it, the last car gets a
  // stub, and the gaps in between are the race.
  const best = result.order[0].result
  const worst = result.order[result.order.length - 1].result
  const spread = Math.max(best - worst, 1e-6)
  const barWidth = (value: number) => 18 + 82 * ((value - worst) / spread)
  return (
    <div>
      <div className="mb-4 flex items-baseline gap-3">
        <span className="text-4xl font-black tabular-nums">
          P{result.position}
        </span>
        <span className="text-2xl font-extrabold text-gold-2">
          +{formatEuros(result.payout)}
        </span>
      </div>

      <ol className="mb-5 space-y-1">
        <AnimatePresence initial={false}>
          {result.order.map((entrant, i) => (
            <motion.li
              key={entrant.card.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`relative overflow-hidden rounded-lg border px-3 py-2 text-sm ${
                entrant.mine
                  ? 'border-gold-2/60 bg-gold-2/[0.08] font-bold'
                  : 'border-white/10 bg-white/[0.03] text-white/60'
              }`}
            >
              {/* The bar is how far behind the winner each car finished — the
                  race itself, rather than a number nobody can read. */}
              <motion.span
                aria-hidden
                className={`absolute inset-y-0 left-0 ${
                  entrant.mine ? 'bg-gold-2/25' : 'bg-white/[0.07]'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${barWidth(entrant.result)}%` }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.05 }}
              />
              <span className="relative flex items-center gap-3">
                <span className="w-5 shrink-0 tabular-nums text-white/40">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">
                  {entrant.card.make} {entrant.card.model}
                </span>
                <span className="shrink-0 tabular-nums text-white/35">{entrant.card.overall}</span>
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAgain}
          className="flex-1 rounded-xl bg-gold-2 py-2.5 text-sm font-extrabold text-black transition hover:brightness-110"
        >
          Race again
        </button>
        <button
          type="button"
          onClick={onChangeCar}
          className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-bold transition hover:bg-white/20"
        >
          Change car
        </button>
      </div>
    </div>
  )
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: 'events' | 'championship'
  onChange: (mode: 'events' | 'championship') => void
}) {
  return (
    <div className="mb-5 inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
      {(['events', 'championship'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`rounded-lg px-4 py-1.5 text-sm font-bold capitalize transition ${
            mode === m ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/80'
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-6">{children}</div>
}
