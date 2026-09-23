import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CircleCheck, Flag, Lock, Repeat, Trophy, Users } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { formatEuros } from '../game/economy'
import {
  DISCIPLINE_BLURB,
  DISCIPLINE_LABEL,
  EVENTS,
  classOf,
  eligible,
  entryLine,
  payoutFor,
  race,
  withOverrides,
  type RaceEvent,
  type RaceResult,
} from '../game/race'
import { ownedCards, useGame } from '../store/useGame'
import type { CardView } from '../types'
import {
  BackButton,
  BigPosition,
  CarPickList,
  Championship,
  ClassTag,
  DisciplineBadge,
  DisciplineLabel,
  EmptyNote,
  PositionCell,
  RacingWait,
  StatStrip,
  classStyle,
} from './Championship'
import { PageHeader } from './ui/PageHeader'
import { SubTabs } from './ui/SubTabs'

const CLASS_ORDER = ['Rookie', 'Club', 'National', 'Elite', 'Open']

type Mode = 'events' | 'championship'

const MODE_TABS = [
  { id: 'events' as const, label: 'Events', icon: Flag },
  { id: 'championship' as const, label: 'Championship', icon: Trophy },
]

export function Race() {
  const collection = useGame((s) => s.collection)
  const finishRace = useGame((s) => s.finishRace)
  const raceAnimationMs = useGame((s) => s.raceAnimationMs)
  const cardOverrides = useGame((s) => s.cardOverrides)
  const seasonActive = useGame((s) => s.season !== null)

  const [mode, setMode] = useState<Mode>(seasonActive ? 'championship' : 'events')
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

  const tabs = <SubTabs className="mb-6" tabs={MODE_TABS} value={mode} onChange={setMode} />

  if (mode === 'championship') {
    return (
      <div>
        {tabs}
        <Championship />
      </div>
    )
  }

  if (event && car && (running || result)) {
    return (
      <RaceRun
        event={event}
        car={car}
        result={result}
        durationMs={raceAnimationMs}
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
    )
  }

  if (event) {
    const allowed = new Set(eligible(event).map((c) => c.id))
    const mine = garage
      .filter((c) => allowed.has(c.id))
      .sort((a, b) => b.overall - a.overall)
    const cls = classOf(event)
    return (
      <div style={classStyle(cls)}>
        <BackButton onClick={() => setEvent(null)}>All events</BackButton>
        <EventHeader event={event} />

        <div className="mb-6">
          <StatStrip
            items={[
              { label: 'Entry', value: entryLine(event), wide: true },
              {
                label: 'Winner takes',
                value: <span className="num text-lg text-gold-2">{formatEuros(payoutFor(event, 1))}</span>,
              },
              {
                label: 'Last place still pays',
                value: <span className="num text-lg">{formatEuros(payoutFor(event, event.grid))}</span>,
              },
            ]}
          />
        </div>

        {mine.length === 0 ? (
          <EmptyNote>Nothing in your garage can enter this one. Come back when you own a car that fits.</EmptyNote>
        ) : (
          <>
            <p className="eyebrow mb-2">
              Pick your car · {mine.length} eligible
            </p>
            <CarPickList event={event} cars={mine} onPick={(entry) => start(entry, event)} />
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      {tabs}
      <PageHeader
        eyebrow="Race meetings"
        title="Race"
        subtitle="No timers and no limit — race as often as you like. What you earn depends on bringing the right car: a drag strip and a concours lawn want completely different things, and a well-matched entry pays around ten times a lazy one."
        right={session.races > 0 ? <SessionTally session={session} /> : undefined}
      />

      {CLASS_ORDER.map((cls) => {
        const events = EVENTS.filter((e) => classOf(e) === cls)
        if (!events.length) return null
        const top = Math.max(...events.map((e) => payoutFor(e, 1)))
        return (
          <section key={cls} className="mb-8" style={classStyle(cls)} aria-label={`${cls} events`}>
            <div className="mb-3 flex items-center gap-3">
              <ClassTag cls={cls} className="text-sm" />
              <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-(--cls)/40 to-transparent" />
              <span className="eyebrow">
                Wins up to <span className="num text-sm tracking-normal text-white/70">{formatEuros(top)}</span>
              </span>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {events.map((e) => {
                const allowed = new Set(eligible(e).map((c) => c.id))
                const ready = garage.filter((c) => allowed.has(c.id)).length
                return (
                  <li key={e.id}>
                    <EventTile event={e} ready={ready} onOpen={() => setEvent(e)} />
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

/** One event on the board: what it is, what it pays, and whether you can go. */
function EventTile({ event, ready, onOpen }: { event: RaceEvent; ready: number; onOpen: () => void }) {
  const locked = ready === 0
  return (
    <button
      type="button"
      data-event
      disabled={locked}
      onClick={onOpen}
      className={`panel group relative flex h-full min-h-[5.5rem] w-full overflow-hidden text-left ${
        locked ? 'cursor-not-allowed opacity-55' : 'panel-interactive'
      }`}
    >
      <span aria-hidden className={`w-1 shrink-0 ${locked ? 'bg-white/10' : 'bg-(--cls)'}`} />
      <span className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3 pr-3.5">
        <DisciplineBadge discipline={event.discipline} locked={locked} />
        <span className="min-w-0 flex-1">
          <span className={`eyebrow block ${locked ? '' : 'text-(--cls)'}`}>{DISCIPLINE_LABEL[event.discipline]}</span>
          <span className="block truncate font-display text-lg font-bold uppercase italic leading-tight tracking-wide">
            {event.name}
          </span>
          <span className="block truncate text-xs text-white/45">{entryLine(event)}</span>
          <span
            className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${locked ? 'text-white/45' : 'text-go'}`}
          >
            {locked ? (
              <Lock size={13} strokeWidth={2.4} aria-hidden />
            ) : (
              <CircleCheck size={13} strokeWidth={2.4} aria-hidden />
            )}
            {ready ? `${ready} of your cars can enter` : 'no car of yours fits'}
          </span>
        </span>
        <span className="shrink-0 self-start text-right">
          <span className="eyebrow block">Win</span>
          <span className={`num block text-2xl leading-none ${locked ? 'text-white/50' : 'text-gold-2'}`}>
            {formatEuros(payoutFor(event, 1))}
          </span>
          <span className="mt-1 inline-flex items-center gap-1 text-xs text-white/40">
            <Users size={12} aria-hidden />
            {event.grid} cars
          </span>
        </span>
      </span>
    </button>
  )
}

/** The event's name and what it is judged on, as the screen's title. */
function EventHeader({ event, right }: { event: RaceEvent; right?: ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <div className="hidden pt-1 sm:block">
        <DisciplineBadge discipline={event.discipline} size="lg" />
      </div>
      <PageHeader
        className="min-w-0 flex-1"
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <ClassTag cls={classOf(event)} />
            <DisciplineLabel discipline={event.discipline} className="text-(--cls)" />
          </span>
        }
        title={event.name}
        subtitle={DISCIPLINE_BLURB[event.discipline]}
        right={right}
      />
    </div>
  )
}

function SessionTally({ session }: { session: { races: number; earned: number } }) {
  return (
    <div className="panel flex items-center gap-4 px-4 py-2">
      <div>
        <p className="eyebrow">This session</p>
        <p className="num text-lg leading-tight">
          {session.races} {session.races === 1 ? 'race' : 'races'}
        </p>
      </div>
      <div className="h-8 w-px bg-white/10" />
      <div>
        <p className="eyebrow">Earned</p>
        <p className="num text-lg leading-tight text-gold-2">{formatEuros(session.earned)}</p>
      </div>
    </div>
  )
}

function RaceRun({
  event,
  car,
  result,
  durationMs,
  session,
  onAgain,
  onChangeCar,
  onBack,
}: {
  event: RaceEvent
  car: CardView
  result: RaceResult | null
  durationMs: number
  session: { races: number; earned: number }
  onAgain: () => void
  onChangeCar: () => void
  onBack: () => void
}) {
  return (
    <div style={classStyle(classOf(event))}>
      <BackButton onClick={onBack}>All events</BackButton>
      <EventHeader event={event} right={<SessionTally session={session} />} />

      {result ? (
        <Finished result={result} onAgain={onAgain} onChangeCar={onChangeCar} />
      ) : (
        // Keyed by the session count so "Race again" restarts the bar.
        <RacingWait
          key={session.races}
          label="Racing…"
          car={`${car.make} ${car.model}`}
          durationMs={durationMs}
        />
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
  const reduce = useReducedMotion()
  // Fitness scores bunch up between about 0.5 and 0.9, so drawing each bar as
  // a fraction of the winner's makes every race look like a dead heat. Stretch
  // the field across the row instead: the winner fills it, the last car gets a
  // stub, and the gaps in between are the race.
  const best = result.order[0].result
  const worst = result.order[result.order.length - 1].result
  const spread = Math.max(best - worst, 1e-6)
  const barWidth = (value: number) => 18 + 82 * ((value - worst) / spread)
  const mine = result.order.find((e) => e.mine)?.card
  const verdict = result.position === 1 ? 'Victory' : result.position <= 3 ? 'Podium' : 'Finished'
  return (
    <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
      <div className="flex flex-col gap-4">
        <section className="panel-cut relative overflow-hidden p-5">
          {result.position === 1 && (
            <span
              aria-hidden
              className="pointer-events-none absolute -left-10 -top-16 size-52 rounded-full bg-gold-2/20 blur-3xl"
            />
          )}
          <p className="eyebrow relative mb-2">{verdict}</p>
          <div className="relative">
            <BigPosition position={result.position} of={result.order.length} />
          </div>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="num relative mt-3 text-4xl leading-none text-gold-2"
          >
            +{formatEuros(result.payout)}
          </motion.p>
          {mine && <p className="relative mt-2 truncate text-sm text-white/55">{mine.make} {mine.model}</p>}
        </section>

        <div className="grid gap-2 max-lg:order-last sm:grid-cols-[1fr_auto] lg:grid-cols-1">
          <button type="button" onClick={onAgain} className="btn btn-primary btn-lg w-full">
            <Repeat size={18} strokeWidth={2.6} aria-hidden />
            Race again
          </button>
          <button type="button" onClick={onChangeCar} className="btn btn-secondary w-full">
            Change car
          </button>
        </div>
      </div>

      <div className="min-w-0">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="headline text-lg">Classification</span>
          <span className="eyebrow">Bar = gap to winner</span>
        </div>
        <ol className="space-y-1">
          {/* Not initial={false}: that would pass down to the bars and start
              them at full length, which is the moment the race is. */}
          <AnimatePresence>
            {result.order.map((entrant, i) => (
              <motion.li
                key={entrant.card.id}
                layout
                initial={reduce ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`relative flex min-h-11 items-center overflow-hidden rounded-lg border ${
                  entrant.mine ? 'border-gold-2/60 bg-gold-2/[0.06]' : 'border-white/[0.07] bg-white/[0.02]'
                }`}
              >
                {/* The bar is how far behind the winner each car finished — the
                    race itself, rather than a number nobody can read. */}
                <motion.span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 ${
                    entrant.mine
                      ? 'bg-gradient-to-r from-gold-2/10 to-gold-2/30'
                      : 'bg-gradient-to-r from-white/[0.02] to-white/[0.08]'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth(entrant.result)}%` }}
                  transition={reduce ? { duration: 0 } : { duration: 0.5, delay: 0.1 + i * 0.05 }}
                />
                <span className="relative flex w-full items-center gap-3 py-1.5 pl-1.5 pr-3">
                  <PositionCell position={i + 1} />
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${
                      entrant.mine ? 'font-bold text-white' : 'font-medium text-white/65'
                    }`}
                  >
                    {entrant.card.make} {entrant.card.model}
                  </span>
                  {entrant.mine && <span className="tag shrink-0">You</span>}
                  <span className="num w-7 shrink-0 text-right text-base text-white/40">{entrant.card.overall}</span>
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      </div>
    </div>
  )
}
