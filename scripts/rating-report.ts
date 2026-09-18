/**
 * Reports how the rating curve actually behaves: tier split, the shape of the
 * distribution, where the cars the ratings were tuned against land, and which
 * cars sit at each extreme.
 *
 * Run with `npm run report:ratings`.
 */
import { CARS } from '../src/data/cars'
import { BRONZE_CEILING, GOLD_FLOOR, overall, tierOf } from '../src/game/rating'
import type { Car } from '../src/types'

/** The cars the user named as anchors, with the rating each should land on. */
export const ANCHORS: { match: RegExp; target: number; label: string }[] = [
  { match: /^Fiat Panda$/i, target: 61, label: 'Fiat Panda 69hp' },
  { match: /^Volkswagen Polo$/i, target: 67, label: 'Polo 95hp' },
  { match: /^Alfa Romeo Giulietta$/i, target: 75, label: 'Giulietta 1.4 MultiAir' },
  { match: /^Volkswagen Golf GTI$/i, target: 80, label: 'Golf GTI' },
  { match: /^Volkswagen Golf R$/i, target: 84, label: 'Golf R' },
  { match: /^Porsche 911 GT3 RS$/i, target: 91, label: '911 GT3 RS' },
  { match: /^Bugatti Veyron$/i, target: 95, label: 'Veyron' },
  { match: /^Bugatti Chiron Super Sport 300\+$/i, target: 98, label: 'Chiron Super Sport' },
]

function label(car: Car): string {
  return `${car.make} ${car.model}`
}

function histogram(values: number[]): void {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const buckets = new Map<number, number>()
  for (const v of values) buckets.set(v, (buckets.get(v) ?? 0) + 1)
  const peak = Math.max(...buckets.values())

  for (let r = min; r <= max; r++) {
    const n = buckets.get(r) ?? 0
    const bar = '#'.repeat(Math.round((n / peak) * 54))
    const tier = r < BRONZE_CEILING ? 'B' : r < GOLD_FLOOR ? 'S' : 'G'
    console.log(`${String(r).padStart(3)} ${tier} ${String(n).padStart(4)} ${bar}`)
  }
}

function main() {
  const rated = CARS.filter((c) => !c.special).map((c) => ({ car: c, r: overall(c.stats, c.year) }))
  const values = rated.map((x) => x.r)
  const sorted = [...values].sort((a, b) => a - b)
  const at = (p: number) => sorted[Math.floor((sorted.length - 1) * p)]

  console.log(`=== ${rated.length} non-special cars ===\n`)
  histogram(values)

  const tiers = { bronze: 0, silver: 0, gold: 0 }
  for (const { r } of rated) tiers[tierOf(r)]++
  const pct = (n: number) => `${((n / rated.length) * 100).toFixed(1)}%`

  console.log(`\nmin ${sorted[0]}  p25 ${at(0.25)}  median ${at(0.5)}  p75 ${at(0.75)}  max ${sorted.at(-1)}`)
  console.log(`spread: ${sorted.at(-1)! - sorted[0]} points of the 1-99 scale`)
  console.log(
    `\nbronze ${tiers.bronze} (${pct(tiers.bronze)})  ` +
      `silver ${tiers.silver} (${pct(tiers.silver)})  gold ${tiers.gold} (${pct(tiers.gold)})`,
  )

  console.log('\n=== anchors ===')
  for (const { match, target, label: name } of ANCHORS) {
    const hits = rated.filter((x) => match.test(label(x.car)))
    if (!hits.length) {
      console.log(`  ${name.padEnd(26)} target ${target}  — no such car in the roster`)
      continue
    }
    const got = hits.map((h) => h.r)
    const lo = Math.min(...got)
    const hi = Math.max(...got)
    const range = lo === hi ? `${lo}` : `${lo}-${hi}`
    const off = Math.round(got.reduce((a, b) => a + b, 0) / got.length) - target
    console.log(
      `  ${name.padEnd(26)} target ${String(target).padStart(3)}  got ${range.padEnd(8)}` +
        `${off === 0 ? '' : `(${off > 0 ? '+' : ''}${off})`}  [${hits.length} car${hits.length > 1 ? 's' : ''}]`,
    )
  }

  const byRating = [...rated].sort((a, b) => a.r - b.r)
  console.log('\n=== 12 lowest ===')
  for (const { car, r } of byRating.slice(0, 12)) {
    console.log(`  ${String(r).padStart(3)}  ${label(car).padEnd(34)} ${car.stats.hp}hp ${car.stats.acc}s ${car.stats.topspeed}km/h`)
  }
  console.log('\n=== 12 highest ===')
  for (const { car, r } of byRating.slice(-12).reverse()) {
    console.log(`  ${String(r).padStart(3)}  ${label(car).padEnd(34)} ${car.stats.hp}hp ${car.stats.acc}s ${car.stats.topspeed}km/h`)
  }
}

main()
