/**
 * Finds car rows whose numbers cannot all be true at once.
 *
 * There are 1072 cars and four figures each, and nobody is going to check four
 * thousand numbers against a source by hand. But most wrong figures are not
 * subtly wrong — they are wrong in a way the other three figures contradict. A
 * 1924 Bugatti quoting 0-100 in 8 seconds, a hatchback quoting a 300 km/h top
 * speed, a car whose `stats` and `specs` blocks disagree with each other: none
 * of those need a source to spot, only arithmetic.
 *
 * So this is a shortlist, not a verdict. Everything it prints is worth a human
 * look; a car it stays quiet about has only been found consistent, which is not
 * the same as being right.
 *
 * Run with `npm run audit:specs`.
 */
import { CARS } from '../src/data/cars'
import type { Car } from '../src/types'

interface Finding {
  car: Car
  kind: string
  detail: string
  /** How far outside the plausible range, for ranking. */
  severity: number
}

const findings: Finding[] = []
const add = (car: Car, kind: string, detail: string, severity: number) =>
  findings.push({ car, kind, detail, severity })

const name = (c: Car) => `${c.make} ${c.model} ${c.year}`

/**
 * The two copies of every car's numbers have to agree.
 *
 * `stats` drives the rating and the racing; `specs` is what the card prints.
 * When they diverge the card lies about the car it is playing as.
 */
for (const car of CARS) {
  const s = car.stats
  const p = car.specs
  const diffs: string[] = []
  if (s.hp !== p.hp) diffs.push(`hp ${s.hp} vs ${p.hp}`)
  if (s.acc !== p.zeroToHundred) diffs.push(`0-100 ${s.acc} vs ${p.zeroToHundred}`)
  if (s.topspeed !== p.topSpeed) diffs.push(`top ${s.topspeed} vs ${p.topSpeed}`)
  if (s.weight !== p.weightKg) diffs.push(`kg ${s.weight} vs ${p.weightKg}`)
  if (diffs.length) add(car, 'stats/specs disagree', diffs.join(', '), 100)
}

/**
 * The hard floor on 0-100.
 *
 * Getting a mass to 27.8 m/s takes a known amount of energy, and an engine can
 * only deliver so much of its peak while the car is still slow. The figure used
 * here — 85% of peak power averaged across the run — is deliberately beyond
 * what any real car manages: a launch-controlled EV with instant torque is the
 * best case and lands nearer 80. Being generous is the point. A claim that
 * beats this bound is not optimistic, it is arithmetically impossible, and
 * flagging merely-flattering figures would bury those in noise.
 */
const KWH_FACTOR = 0.5 * 27.78 ** 2 // joules per kg to reach 100 km/h
for (const car of CARS) {
  const watts = car.stats.hp * 745.7 * 0.85
  const floor = (KWH_FACTOR * car.stats.weight) / watts
  if (car.stats.acc < floor * 0.95) {
    add(
      car,
      'impossibly quick',
      `claims ${car.stats.acc}s to 100 on ${car.stats.hp} hp and ${car.stats.weight} kg; ` +
        `physics floor is about ${floor.toFixed(1)}s`,
      floor / car.stats.acc,
    )
  }
}

/** Least-squares fit of log(y) against log(x), for the trend checks below. */
function logFit(points: [x: number, y: number][]): (x: number) => number {
  const xs = points.map(([x]) => Math.log(x))
  const ys = points.map(([, y]) => Math.log(y))
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  const slope = num / den
  const intercept = my - slope * mx
  return (x: number) => Math.exp(intercept + slope * Math.log(x))
}

/**
 * 0-100 against power-to-weight, and top speed against power.
 *
 * Both relationships are tight enough across a thousand real cars that a row
 * sitting a long way off the line is far more likely to be a typo than a
 * remarkable car. The fit is taken over the roster itself, so it measures each
 * car against the company it keeps rather than against a formula.
 */
const usable = CARS.filter((c) => c.stats.hp > 0 && c.stats.weight > 0 && c.stats.acc > 0)

const accFit = logFit(usable.map((c) => [c.stats.hp / (c.stats.weight / 1000), c.stats.acc]))
for (const car of usable) {
  const pw = car.stats.hp / (car.stats.weight / 1000)
  const expected = accFit(pw)
  const ratio = car.stats.acc / expected
  if (ratio < 0.45 || ratio > 2.2) {
    add(
      car,
      ratio < 1 ? 'quicker than its power suggests' : 'slower than its power suggests',
      `${car.stats.acc}s on ${Math.round(pw)} hp/tonne; cars with that power average ` +
        `${expected.toFixed(1)}s`,
      ratio < 1 ? 1 / ratio : ratio,
    )
  }
}

const speedFit = logFit(usable.map((c) => [c.stats.hp, c.stats.topspeed]))
for (const car of usable) {
  const expected = speedFit(car.stats.hp)
  const ratio = car.stats.topspeed / expected
  if (ratio < 0.55 || ratio > 1.8) {
    add(
      car,
      ratio > 1 ? 'faster than its power allows' : 'slower than its power allows',
      `${car.stats.topspeed} km/h on ${car.stats.hp} hp; that power usually gives ` +
        `${Math.round(expected)} km/h`,
      ratio < 1 ? 1 / ratio : ratio,
    )
  }
}

/**
 * A 0-100 time for a vehicle that cannot reach 100.
 *
 * Three-wheelers and microvans top out below the speed the figure is measured
 * at, so whatever is in the field, it is not a 0-100 time.
 */
for (const car of CARS) {
  // Once the figure is large enough to read as "never gets there", it has
  // stopped lying and there is nothing left to report.
  if (car.stats.topspeed >= 100 || car.stats.acc >= 30) continue
  add(
    car,
    'cannot reach 100 km/h at all',
    `top speed ${car.stats.topspeed} km/h, yet quotes ${car.stats.acc}s to 100`,
    10,
  )
}

/**
 * Cars old enough that the quoted pace is a period claim rather than a
 * measurement. Tyres, brakes and testing standards all moved; a pre-war car
 * matching a modern hot hatch to 100 km/h is a magazine figure, not a fact.
 */
for (const car of CARS) {
  if (car.year >= 1955) continue
  if (car.stats.acc <= 9 || car.stats.topspeed >= 190) {
    add(
      car,
      'period figures look modern',
      `${car.year} car quoting ${car.stats.acc}s to 100 and ${car.stats.topspeed} km/h`,
      1 + (1955 - car.year) / 50,
    )
  }
}

/** The same car listed twice with different numbers. */
const byName = new Map<string, Car[]>()
for (const car of CARS) {
  const key = `${car.make} ${car.model}`.toLowerCase()
  if (!byName.has(key)) byName.set(key, [])
  byName.get(key)!.push(car)
}
for (const [, group] of byName) {
  if (group.length < 2) continue
  const same = (a: Car, b: Car) =>
    a.year === b.year &&
    (a.stats.hp !== b.stats.hp ||
      a.stats.acc !== b.stats.acc ||
      a.stats.topspeed !== b.stats.topspeed ||
      a.stats.weight !== b.stats.weight)
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      if (!same(group[i], group[j])) continue
      add(
        group[i],
        'same car, two sets of numbers',
        `${group[i].id}: ${group[i].stats.hp}hp/${group[i].stats.acc}s vs ` +
          `${group[j].id}: ${group[j].stats.hp}hp/${group[j].stats.acc}s`,
        2,
      )
    }
  }
}

const order = [
  'stats/specs disagree',
  'cannot reach 100 km/h at all',
  'impossibly quick',
  'same car, two sets of numbers',
  'quicker than its power suggests',
  'faster than its power allows',
  'slower than its power suggests',
  'slower than its power allows',
  'period figures look modern',
]

console.log(`${CARS.length} cars checked\n`)
for (const kind of order) {
  const rows = findings.filter((f) => f.kind === kind).sort((a, b) => b.severity - a.severity)
  if (!rows.length) continue
  console.log(`${kind} — ${rows.length}`)
  for (const row of rows.slice(0, 25)) {
    console.log(`  ${name(row.car).padEnd(38)} ${row.detail}`)
  }
  if (rows.length > 25) console.log(`  … and ${rows.length - 25} more`)
  console.log()
}

const flagged = new Set(findings.map((f) => f.car.id))
console.log(`${flagged.size} of ${CARS.length} cars carry at least one finding.`)
