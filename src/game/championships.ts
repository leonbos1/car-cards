import type { CardView } from '../types'
import { EVENT_BY_ID, eligible, fitness, payoutFor, rollResult, type RaceEvent } from './race'

/**
 * Championship seasons: a fixed run of rounds across disciplines, raced
 * against the same rivals every round and scored on a points table.
 *
 * The rule that makes it a different game from ordinary racing is that a car
 * may start only one round per season. Ordinary racing is solved the moment
 * you find your best car for an event; a season asks whether you have a good
 * car for five events at once, and which round to spend your all-rounder on.
 */

export interface Season {
  id: string
  name: string
  /** Event ids, run in this order. Every round shares one grid size. */
  rounds: string[]
}

export const SEASONS: Season[] = [
  {
    id: 'rookie-cup',
    name: 'Rookie Cup',
    rounds: ['rookie-circuit', 'rookie-drag', 'rookie-offroad', 'rookie-speed'],
  },
  {
    id: 'club-championship',
    name: 'Club Championship',
    rounds: ['club-drag', 'club-circuit', 'club-show', 'club-offroad', 'club-speed'],
  },
  {
    id: 'national-championship',
    name: 'National Championship',
    rounds: ['national-circuit', 'national-drag', 'national-offroad', 'national-show', 'national-speed'],
  },
  {
    id: 'elite-championship',
    name: 'Elite Championship',
    rounds: ['elite-drag', 'elite-circuit', 'elite-show', 'elite-offroad', 'elite-speed'],
  },
]

export const SEASON_BY_ID = new Map(SEASONS.map((s) => [s.id, s]))

export function roundEvent(season: Season, round: number): RaceEvent {
  const event = EVENT_BY_ID.get(season.rounds[round])
  if (!event) throw new Error(`${season.id} round ${round} names no event`)
  return event
}

export function gridOf(season: Season): number {
  return roundEvent(season, 0).grid
}

/** Stands in for a rival id in results and standings. */
export const YOU = 'you'

export interface Rival {
  id: string
  name: string
  country: string
  /** 0-1: how far up the field, ranked by fitness, this rival picks a car from. */
  skill: number
}

const ROSTER: Omit<Rival, 'skill'>[] = [
  { id: 'varga', name: 'Elena Varga', country: 'HU' },
  { id: 'sakamoto', name: 'Kenta Sakamoto', country: 'JP' },
  { id: 'bellini', name: 'Marco Bellini', country: 'IT' },
  { id: 'lindqvist', name: 'Freya Lindqvist', country: 'SE' },
  { id: 'pritchard', name: 'Owen Pritchard', country: 'GB' },
  { id: 'brandt', name: 'Lukas Brandt', country: 'DE' },
  { id: 'moreau', name: 'Camille Moreau', country: 'FR' },
]

/**
 * The spread of the rival field. The best rival picks from near the top of
 * the eligible cars for each round, but not the very top, so a season is
 * winnable without owning the single best car in the game for every event —
 * which, with luck as small as it is, would make the title unwinnable for
 * anyone who did not.
 */
const TOP_SKILL = 0.9
const BOTTOM_SKILL = 0.45
/** How far either side of its target, as a share of the field, a rival's pick can land. */
const PICK_SPREAD = 0.06

export function rivalsFor(season: Season): Rival[] {
  const count = gridOf(season) - 1
  return ROSTER.slice(0, count).map((rival, i) => ({
    ...rival,
    skill: TOP_SKILL - (i * (TOP_SKILL - BOTTOM_SKILL)) / Math.max(1, count - 1),
  }))
}

export function driverName(season: Season, driver: string): string {
  if (driver === YOU) return 'You'
  return rivalsFor(season).find((r) => r.id === driver)?.name ?? driver
}

const RANKED = new WeakMap<RaceEvent, CardView[]>()

/** An event's eligible cars, best-suited first. */
function ranked(event: RaceEvent): CardView[] {
  const hit = RANKED.get(event)
  if (hit) return hit
  const pool = [...eligible(event)].sort((a, b) => fitness(b, event) - fitness(a, event))
  RANKED.set(event, pool)
  return pool
}

/** Each rival's car for a round. No two entrants share a car. */
export function pickRivalCars(
  event: RaceEvent,
  rivals: Rival[],
  taken: Set<string>,
  rng: () => number,
): Map<string, CardView> {
  const pool = ranked(event)
  const used = new Set(taken)
  const picks = new Map<string, CardView>()
  const spread = Math.max(1, pool.length * PICK_SPREAD)
  for (const rival of rivals) {
    const target = (1 - rival.skill) * (pool.length - 1)
    const start = Math.min(pool.length - 1, Math.max(0, Math.round(target + (rng() * 2 - 1) * spread)))
    // Nearest free car to where the rival aimed, looking both ways.
    for (let d = 0; d < pool.length; d++) {
      const car = [pool[start + d], pool[start - d]].find((c) => c && !used.has(c.id))
      if (car) {
        used.add(car.id)
        picks.set(rival.id, car)
        break
      }
    }
  }
  return picks
}

export interface RoundEntry {
  driver: string
  carId: string
}

export interface RoundResult {
  eventId: string
  /** Finishing order, winner first. */
  order: RoundEntry[]
  /** Where you finished, or null if you sat the round out. */
  position: number | null
  payout: number
}

/**
 * Run one round. `car` is null when you sit it out: the rivals race anyway
 * and you score nothing.
 */
export function runRound(
  season: Season,
  round: number,
  car: CardView | null,
  rng: () => number = Math.random,
): RoundResult {
  const event = roundEvent(season, round)
  const rivals = rivalsFor(season)
  const picks = pickRivalCars(event, rivals, new Set(car ? [car.id] : []), rng)
  const entrants = [
    ...(car ? [{ driver: YOU, card: car }] : []),
    ...rivals.flatMap((r) => {
      const card = picks.get(r.id)
      return card ? [{ driver: r.id, card }] : []
    }),
  ]
  const order = entrants
    .map((e) => ({ ...e, result: rollResult(e.card, event, rng) }))
    .sort((a, b) => b.result - a.result)
  const index = order.findIndex((e) => e.driver === YOU)
  const position = index === -1 ? null : index + 1
  return {
    eventId: event.id,
    order: order.map((e) => ({ driver: e.driver, carId: e.card.id })),
    position,
    payout: position ? payoutFor(event, position) : 0,
  }
}

/**
 * How many of the rounds from `from` onward you could put a car into, each
 * car used at most once. A per-round count would say five out of five for a
 * garage with one car eligible everywhere, when it can only ever start one;
 * this is a proper matching of cars to rounds.
 */
export function fieldableRounds(
  season: Season,
  garage: CardView[],
  used: string[] = [],
  from = 0,
): number {
  const available = garage.filter((c) => !used.includes(c.id))
  const options = season.rounds.slice(from).map((_, i) => {
    const allowed = new Set(eligible(roundEvent(season, from + i)).map((c) => c.id))
    return available.filter((c) => allowed.has(c.id)).map((c) => c.id)
  })
  const roundFor = new Map<string, number>()
  const place = (round: number, seen: Set<string>): boolean => {
    for (const car of options[round]) {
      if (seen.has(car)) continue
      seen.add(car)
      const other = roundFor.get(car)
      if (other === undefined || place(other, seen)) {
        roundFor.set(car, round)
        return true
      }
    }
    return false
  }
  return options.filter((_, round) => place(round, new Set())).length
}

/** Points by finishing position. Below the table scores nothing. */
export const POINTS = [25, 18, 15, 12, 10, 8, 6, 4]

export function pointsFor(position: number): number {
  return POINTS[position - 1] ?? 0
}

export interface Standing {
  driver: string
  points: number
  wins: number
}

/** The table after the rounds run so far. Ties go to the driver with more wins. */
export function standings(season: Season, rounds: RoundResult[]): Standing[] {
  const drivers = [YOU, ...rivalsFor(season).map((r) => r.id)]
  const table = new Map(drivers.map((d) => [d, { driver: d, points: 0, wins: 0 }]))
  for (const round of rounds) {
    round.order.forEach((entry, i) => {
      const row = table.get(entry.driver)
      if (!row) return
      row.points += pointsFor(i + 1)
      if (i === 0) row.wins += 1
    })
  }
  return drivers
    .map((d) => table.get(d)!)
    .sort((a, b) => b.points - a.points || b.wins - a.wins)
}

/**
 * Title money, as multiples of what winning one round of the season pays.
 *
 * Sized so that a season you can win out-earns grinding your best car for
 * the same number of races, and one you cannot win does not: each round
 * forces a different car, so most of them are entered with something less
 * than your best, and the bonus is what pays for that.
 */
const BONUS_SHARE = [4, 2, 1]

export function seasonBonus(season: Season, position: number): number {
  const winnerPay =
    season.rounds.reduce((sum, _, i) => sum + payoutFor(roundEvent(season, i), 1), 0) /
    season.rounds.length
  return Math.round(winnerPay * (BONUS_SHARE[position - 1] ?? 0))
}
