import { ALL_CARDS } from './pack'
import type { CardView } from '../types'

/**
 * Race meetings: the one way to earn that is not on a clock.
 *
 * Every other faucet in the game is bounded by a cooldown — the free pack, the
 * quiz, the contract board — which is what stops them printing money but also
 * what ends a session. Racing is bounded by something else: how well the car
 * you enter suits the event, and how much of the roster you own. Enter your
 * best-matched car in an event you can win and you earn several times what a
 * poor entry pays, and you can do it as often as you like.
 *
 * There is no entry fee. A grind that can cost you money punishes the player
 * for exploring their garage, and the interesting decision is not "is this
 * worth the risk" but "which of my cars is actually fast here" — a drag strip
 * wants power and launch, a circuit wants a light car that turns, a concours
 * does not care how fast anything is. So every finish pays something, and the
 * spread between a good entry and a lazy one is wide enough to be the game.
 */

export type Discipline = 'drag' | 'circuit' | 'topspeed' | 'concours'

/** Which stats each discipline actually rewards, and how much. */
const WEIGHTS: Record<Discipline, Partial<Record<Stat, number>>> = {
  drag: { hp: 0.4, acc: 0.42, weight: 0.18 },
  circuit: { handling: 0.42, acc: 0.24, weight: 0.22, hp: 0.12 },
  topspeed: { topspeed: 0.58, hp: 0.3, acc: 0.12 },
  concours: { wowFactor: 0.72, age: 0.28 },
}

/**
 * `age` is not on the card — it is derived, and it is what makes the concours
 * more than a wow-factor sort. An old car with presence beats a new one with
 * the same presence, which is the only place in the game a 1960s saloon can
 * beat a modern supercar at anything.
 */
type Stat = 'hp' | 'acc' | 'topspeed' | 'weight' | 'handling' | 'wowFactor' | 'age'

/** Stats where a smaller number is the better one. */
const LOWER_IS_BETTER: Stat[] = ['acc', 'weight']

function statOf(card: CardView, stat: Stat): number {
  if (stat === 'age') return -card.year
  return card.stats[stat]
}

export const DISCIPLINE_LABEL: Record<Discipline, string> = {
  drag: 'Drag',
  circuit: 'Circuit',
  topspeed: 'Top speed',
  concours: 'Concours',
}

/** What the event is judged on, in the words a player would use. */
export const DISCIPLINE_BLURB: Record<Discipline, string> = {
  drag: 'Power, launch and low weight over a standing quarter.',
  circuit: 'Handling and weight through the corners; power barely matters.',
  topspeed: 'Everything is the number on the far end of the speedo.',
  concours: 'Judged on presence, not pace. Age counts in your favour.',
}

export interface RaceEvent {
  id: string
  name: string
  discipline: Discipline
  /** The class of car the event is for. */
  minOverall?: number
  maxOverall?: number
  /** Themed events narrow the field further. */
  country?: string
  maxWeight?: number
  /** Prize for winning. Every other finishing position is a fraction of it. */
  prize: number
  /** Cars on the grid, yours included. */
  grid: number
}

/**
 * The card money pays out on, by finishing position.
 *
 * Fourth and below still pays. A grind where most runs return nothing is a
 * grind nobody does, and the gap between first and last is already a factor of
 * ten, which is plenty of reason to enter the right car.
 */
const POSITION_PAYOUT = [1, 0.5, 0.3]
const FINISHER_PAYOUT = 0.1

/**
 * The dial on the whole thing.
 *
 * Racing has no cooldown, so what it pays per hour is set by the prize and by
 * how long a race takes to run — nothing else bounds it. At 1.0 and the seven
 * seconds a race takes to watch and tap again, a starter garage earned about
 * €7.000 an hour and a deep one about €35.000, which put the best car in the
 * game somewhere between three and fifteen hours of racing.
 *
 * Set to 10 deliberately. That makes racing roughly seventy thousand a day for
 * a new garage and a third of a million an hour for a full one, so the best
 * car in the game is about twenty minutes of racing rather than three hours,
 * and every other way of earning — packs, the quiz, the contract board, the
 * market — is now rounding error beside it. That is the intended trade, not
 * drift: turn it back down to make the rest of the economy matter again.
 */
export const PRIZE_SCALE = 10

/**
 * How much luck is in a race.
 *
 * Each entrant's result is its fitness for the event moved by up to this much
 * either way. Too little and the fastest car always wins, so there is no race;
 * too much and the car you pick stops mattering, which is the whole game. At
 * 0.17 a well-matched car wins about half its races and a poor one still steals
 * the odd win.
 */
const LUCK = 0.17

export const EVENTS: RaceEvent[] = [
  // Rookie — everything a new player owns can enter something here.
  { id: 'rookie-drag', name: 'Parking Lot Sprint', discipline: 'drag', maxOverall: 69, prize: 6, grid: 6 },
  { id: 'rookie-circuit', name: 'Backstreet Circuit', discipline: 'circuit', maxOverall: 69, prize: 6, grid: 6 },
  { id: 'rookie-speed', name: 'Motorway Blast', discipline: 'topspeed', maxOverall: 69, prize: 6, grid: 6 },

  // Club.
  { id: 'club-drag', name: 'Club Drag Night', discipline: 'drag', minOverall: 70, maxOverall: 79, prize: 15, grid: 6 },
  { id: 'club-circuit', name: 'Club Circuit', discipline: 'circuit', minOverall: 70, maxOverall: 79, prize: 15, grid: 6 },
  { id: 'club-speed', name: 'Coastal Run', discipline: 'topspeed', minOverall: 70, maxOverall: 79, prize: 15, grid: 6 },
  { id: 'club-show', name: 'Cars and Coffee', discipline: 'concours', minOverall: 70, maxOverall: 79, prize: 15, grid: 6 },

  // National.
  { id: 'national-drag', name: 'National Drags', discipline: 'drag', minOverall: 80, maxOverall: 87, prize: 38, grid: 8 },
  { id: 'national-circuit', name: 'National Circuit', discipline: 'circuit', minOverall: 80, maxOverall: 87, prize: 38, grid: 8 },
  { id: 'national-speed', name: 'Speed Trials', discipline: 'topspeed', minOverall: 80, maxOverall: 87, prize: 38, grid: 8 },
  { id: 'national-show', name: "Concours d'Elegance", discipline: 'concours', minOverall: 80, maxOverall: 87, prize: 38, grid: 8 },

  // Elite. The cars that qualify are the ones the market keeps to itself, so
  // the best-paying grind is only open once you have bought your way into it.
  { id: 'elite-drag', name: 'Unlimited Drags', discipline: 'drag', minOverall: 88, prize: 70, grid: 8 },
  { id: 'elite-circuit', name: 'Grand Prix Circuit', discipline: 'circuit', minOverall: 88, prize: 70, grid: 8 },
  { id: 'elite-speed', name: 'Land Speed Trials', discipline: 'topspeed', minOverall: 88, prize: 70, grid: 8 },
  { id: 'elite-show', name: 'Villa Concorso', discipline: 'concours', minOverall: 88, prize: 70, grid: 8 },

  // Themed. No rating band at all, which is the point — these are the events
  // where an odd car you would otherwise never enter is the right answer. They
  // pay below club money precisely because they are open to everyone: an event
  // a starter garage can win has to be priced like one.
  { id: 'open-italian', name: 'Strada Italiana', discipline: 'circuit', country: 'IT', prize: 14, grid: 6 },
  { id: 'open-light', name: 'Featherweight Cup', discipline: 'circuit', maxWeight: 1_200, prize: 14, grid: 6 },
]

export const EVENT_BY_ID = new Map(EVENTS.map((e) => [e.id, e]))

/** The class an event runs for, read off its rating band. */
export function classOf(event: RaceEvent): string {
  if (event.minOverall === undefined && event.maxOverall === undefined) return 'Open'
  if (event.minOverall !== undefined && event.minOverall >= 88) return 'Elite'
  if (event.minOverall !== undefined && event.minOverall >= 80) return 'National'
  if (event.minOverall !== undefined && event.minOverall >= 70) return 'Club'
  return 'Rookie'
}

/** What the event requires of an entry, in one line. */
export function entryLine(event: RaceEvent): string {
  const parts: string[] = []
  if (event.minOverall !== undefined && event.maxOverall !== undefined) {
    parts.push(`rated ${event.minOverall}-${event.maxOverall}`)
  } else if (event.minOverall !== undefined) parts.push(`rated ${event.minOverall}+`)
  else if (event.maxOverall !== undefined) parts.push(`rated up to ${event.maxOverall}`)
  if (event.country) parts.push('Italian cars')
  if (event.maxWeight) parts.push(`under ${event.maxWeight} kg`)
  return parts.join(', ') || 'anything'
}

/**
 * The stats an event is judged on, heaviest first — so the car picker can show
 * the numbers that decide the race instead of the rating, which does not.
 */
export const DISCIPLINE_STATS: Record<Discipline, Stat[]> = Object.fromEntries(
  (Object.keys(WEIGHTS) as Discipline[]).map((d) => [
    d,
    (Object.entries(WEIGHTS[d]) as [Stat, number][])
      .sort((a, b) => b[1] - a[1])
      .map(([stat]) => stat),
  ]),
) as Record<Discipline, Stat[]>

export type { Stat }

/** How a stat reads on a card, with its unit. */
export function statLabel(stat: Stat): string {
  return { hp: 'hp', acc: '0-100', topspeed: 'top', weight: 'kg', handling: 'handling', wowFactor: 'wow', age: 'year' }[stat]
}

export function statValue(card: CardView, stat: Stat): string {
  if (stat === 'age') return String(card.year)
  if (stat === 'acc') return `${card.stats.acc}s`
  return String(card.stats[stat])
}

/** Cars allowed to enter. Specials race like anything else. */
export function eligible(event: RaceEvent): CardView[] {
  const hit = ELIGIBLE.get(event)
  if (hit) return hit
  const pool = ALL_CARDS.filter(
    (c) =>
      (event.minOverall === undefined || c.overall >= event.minOverall) &&
      (event.maxOverall === undefined || c.overall <= event.maxOverall) &&
      (event.country === undefined || c.country === event.country) &&
      (event.maxWeight === undefined || c.stats.weight <= event.maxWeight),
  )
  ELIGIBLE.set(event, pool)
  return pool
}

const ELIGIBLE = new WeakMap<RaceEvent, CardView[]>()

/**
 * How well a car suits an event, from 0 to 1.
 *
 * Measured against the rest of the field rather than against the whole roster:
 * a 1.100 kg car is light for a national circuit race and heavy for the
 * Featherweight Cup, and the same car should score differently in each. So each
 * stat becomes the fraction of the eligible pool it beats, and the discipline's
 * weights combine those.
 */
export function fitness(card: CardView, event: RaceEvent): number {
  const ranks = ranksFor(event)
  let total = 0
  for (const [stat, weight] of Object.entries(WEIGHTS[event.discipline]) as [Stat, number][]) {
    total += weight * percentile(statOf(card, stat), ranks[stat]!, LOWER_IS_BETTER.includes(stat))
  }
  return total
}

type Ranks = Partial<Record<Stat, number[]>>
const RANKS = new WeakMap<RaceEvent, Ranks>()

function ranksFor(event: RaceEvent): Ranks {
  const hit = RANKS.get(event)
  if (hit) return hit
  const pool = eligible(event)
  const ranks: Ranks = {}
  for (const stat of Object.keys(WEIGHTS[event.discipline]) as Stat[]) {
    ranks[stat] = pool.map((c) => statOf(c, stat)).sort((a, b) => a - b)
  }
  RANKS.set(event, ranks)
  return ranks
}

/** Fraction of `sorted` this value beats, flipped when smaller is better. */
function percentile(value: number, sorted: number[], lowerIsBetter: boolean): number {
  if (sorted.length < 2) return 0.5
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] < value) lo = mid + 1
    else hi = mid
  }
  const below = lo / (sorted.length - 1)
  return lowerIsBetter ? 1 - below : below
}

export interface Entrant {
  card: CardView
  /** True for the car the player entered. */
  mine: boolean
  /** What the car managed on the day — fitness, moved by luck. */
  result: number
}

export interface RaceResult {
  event: RaceEvent
  /** Finishing order, winner first. */
  order: Entrant[]
  /** Where the player's car came, counting from 1. */
  position: number
  payout: number
}

export function payoutFor(event: RaceEvent, position: number): number {
  const share = POSITION_PAYOUT[position - 1] ?? FINISHER_PAYOUT
  return Math.max(1, Math.round(event.prize * share * PRIZE_SCALE))
}

/**
 * Run one race. `rng` is injectable so the simulation and the tests can measure
 * what this actually pays rather than guess at it.
 */
export function race(card: CardView, event: RaceEvent, rng: () => number = Math.random): RaceResult {
  const pool = eligible(event).filter((c) => c.id !== card.id)
  const field: CardView[] = []
  const taken = new Set<string>()
  while (field.length < Math.max(0, event.grid - 1) && field.length < pool.length) {
    const pick = pool[Math.floor(rng() * pool.length)]
    if (taken.has(pick.id)) continue
    taken.add(pick.id)
    field.push(pick)
  }

  const roll = (c: CardView, mine: boolean): Entrant => ({
    card: c,
    mine,
    result: fitness(c, event) * (1 + (rng() * 2 - 1) * LUCK),
  })

  const order = [roll(card, true), ...field.map((c) => roll(c, false))].sort(
    (a, b) => b.result - a.result,
  )
  const position = order.findIndex((e) => e.mine) + 1
  return { event, order, position, payout: payoutFor(event, position) }
}
