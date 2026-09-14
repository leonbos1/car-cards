/**
 * What racing actually pays.
 *
 * Racing is the only earner in the game with no cooldown, so the thing that
 * bounds it is time: how much a player makes per hour of tapping. This runs
 * every event with a good entry, an average one and a poor one, prints the rate
 * each implies, and then does it again for garages of the size a player
 * actually has at each stage.
 *
 * Run with `npm run report:race`.
 */
import { PACKS } from '../src/data/packs'
import { bookValue, formatEuros } from '../src/game/economy'
import { ALL_CARDS, openPack } from '../src/game/pack'
import { DISCIPLINE_LABEL, EVENTS, eligible, fitness, race } from '../src/game/race'
import type { RaceEvent } from '../src/game/race'
import type { CardView } from '../src/types'

/** Seconds a race takes to pick and watch. The grind's real limiter. */
const SECONDS_PER_RACE = 7
const RUNS = 800
const PER_HOUR = 3_600 / SECONDS_PER_RACE

function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function average(card: CardView, event: RaceEvent, runs = RUNS): { pay: number; wins: number } {
  let pay = 0
  let wins = 0
  for (let seed = 0; seed < runs; seed++) {
    const result = race(card, event, seeded(seed * 2654435761))
    pay += result.payout
    if (result.position === 1) wins++
  }
  return { pay: pay / runs, wins: wins / runs }
}

/** Eligible cars for an event, best-suited first. */
function ranked(event: RaceEvent): CardView[] {
  return [...eligible(event)].sort((a, b) => fitness(b, event) - fitness(a, event))
}

function main() {
  console.log(`a race takes ${SECONDS_PER_RACE}s, so ${PER_HOUR} races an hour\n`)
  console.log(
    'event'.padEnd(21),
    'class'.padEnd(10),
    'pool'.padStart(5),
    'prize'.padStart(7),
    'best entry'.padStart(26),
    'win'.padStart(5),
    'per race'.padStart(9),
    'per hour'.padStart(10),
  )

  for (const event of EVENTS) {
    const best = ranked(event)[0]
    const { pay, wins } = average(best, event)
    console.log(
      event.name.padEnd(21),
      DISCIPLINE_LABEL[event.discipline].padEnd(10),
      String(eligible(event).length).padStart(5),
      formatEuros(event.prize).padStart(7),
      `${best.make} ${best.model}`.slice(0, 26).padStart(26),
      `${(wins * 100).toFixed(0)}%`.padStart(5),
      formatEuros(Math.round(pay)).padStart(9),
      formatEuros(Math.round(pay * PER_HOUR)).padStart(10),
    )
  }

  console.log('\nhow much the car you pick matters (per race):')
  console.log(
    'event'.padEnd(21),
    'best'.padStart(9),
    'median'.padStart(9),
    'worst'.padStart(9),
    'spread'.padStart(7),
  )
  for (const event of EVENTS) {
    const pool = ranked(event)
    const best = average(pool[0], event).pay
    const mid = average(pool[Math.floor(pool.length / 2)], event).pay
    const worst = average(pool[pool.length - 1], event).pay
    console.log(
      event.name.padEnd(21),
      formatEuros(Math.round(best)).padStart(9),
      formatEuros(Math.round(mid)).padStart(9),
      formatEuros(Math.round(worst)).padStart(9),
      `${(best / Math.max(1, worst)).toFixed(1)}x`.padStart(7),
    )
  }

  // What an hour is worth at each stage of a collection, entering the best car
  // you happen to own rather than the best that exists.
  console.log('\nan hour of racing, by what you own:')
  const topCar = Math.max(...ALL_CARDS.filter((c) => !c.special).map(bookValue))
  for (const size of [20, 60, 150, 400, 900]) {
    const garage = pickGarage(size)
    let best = 0
    let bestEvent = EVENTS[0]
    for (const event of EVENTS) {
      const allowed = new Set(eligible(event).map((c) => c.id))
      const mine = garage.filter((c) => allowed.has(c.id))
      if (!mine.length) continue
      const car = mine.reduce((a, b) => (fitness(a, event) > fitness(b, event) ? a : b))
      const rate = average(car, event, 300).pay * PER_HOUR
      if (rate > best) {
        best = rate
        bestEvent = event
      }
    }
    console.log(
      `  ${String(garage.length).padStart(4)} cars  ${formatEuros(Math.round(best)).padStart(10)}` +
        ` an hour  (${bestEvent.name}) — a top car in ${(topCar / best).toFixed(1)} hours`,
    )
  }
}

/**
 * A garage of about `n` cars, built the only way a player can build one: by
 * opening packs. Drawing from the roster at random instead would hand a new
 * player a hypercar and make the early game look far richer than it is.
 */
function pickGarage(n: number): CardView[] {
  const welcome = PACKS.find((p) => p.once)!
  const daily = PACKS.find((p) => p.free && !p.once)!
  const gold = PACKS.find((p) => p.id === 'gold')!
  const premium = PACKS.find((p) => p.id === 'premium-gold')!
  const rng = seeded(99)
  const out = new Map<string, CardView>()

  for (const card of openPack(welcome, rng)) out.set(card.id, card)
  // Bounded: packs cap out at 92, so no amount of opening ever reaches the
  // whole roster and an unbounded loop here would never return.
  for (let i = 0; out.size < n && i < 2_000; i++) {
    const pack = i < 12 ? daily : i < 40 ? gold : premium
    for (const card of openPack(pack, rng)) out.set(card.id, card)
  }
  return [...out.values()]
}

main()
