/**
 * Measures what each pack is actually worth, by opening a lot of them.
 *
 * The number that matters is return: expected quick-sell value divided by
 * price. Anything at or above 1.0 is a money printer — buy, sell everything,
 * repeat — so the whole economy rests on every paid pack sitting well below it.
 *
 * Run with `npm run report:economy`.
 */
import { PACKS, contentsLine } from '../src/data/packs'
import {
  FREE_PACK_COOLDOWN_MS,
  QUICK_SELL_RATE,
  STARTING_BALANCE,
  formatEuros,
} from '../src/game/economy'
import { bidPrice } from '../src/game/market'
import { TOTAL_OBJECTIVE_REWARD } from '../src/game/objectives'
import { openPack, slotPool } from '../src/game/pack'
import { MAX_DAILY_QUIZ_REWARD } from '../src/game/quiz'
import type { Pack } from '../src/types'

const RUNS = 20_000

function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

export function expectedValue(pack: Pack, runs = RUNS): number {
  let total = 0
  for (let seed = 0; seed < runs; seed++) {
    for (const card of openPack(pack, seeded(seed * 2654435761))) total += bidPrice(card, 0)
  }
  return total / runs
}

function main() {
  console.log(`starting balance ${formatEuros(STARTING_BALANCE)}`)
  console.log(`free pack every ${FREE_PACK_COOLDOWN_MS / 3_600_000}h`)
  console.log(`quick-sell pays ${(QUICK_SELL_RATE * 100).toFixed(0)}% of book; the market pays far more\n`)

  console.log('pack             price    market value   return   best possible   smallest pool')
  for (const pack of PACKS) {
    const ev = expectedValue(pack)
    const ret = pack.price ? ev / pack.price : Number.POSITIVE_INFINITY

    // The best card the pack can physically produce, ignoring specials.
    let ceiling = 0
    let smallestPool = Number.POSITIVE_INFINITY
    for (let i = 0; i < pack.tiers.length; i++) {
      const pool = [...slotPool(pack, i, true), ...slotPool(pack, i, false)]
      for (const c of pool) ceiling = Math.max(ceiling, c.overall)
      smallestPool = Math.min(smallestPool, pool.length)
    }

    console.log(
      `${pack.name.padEnd(16)} ${formatEuros(pack.price).padStart(11)}  ` +
        `${formatEuros(Math.round(ev)).padStart(13)}   ` +
        `${(pack.price ? `${(ret * 100).toFixed(0)}%` : '—').padStart(6)}   ` +
        `${String(ceiling).padStart(13)}   ${String(smallestPool).padStart(13)}`,
    )
  }

  console.log('\ncontents')
  for (const pack of PACKS) console.log(`  ${pack.name.padEnd(16)} ${contentsLine(pack)}`)

  const daily = expectedValue(PACKS.find((p) => p.free)!)
  // A player who answers everything correctly; a realistic run earns less.
  const income = daily + MAX_DAILY_QUIZ_REWARD
  console.log(
    `\nDaily income: ${formatEuros(Math.round(daily))} from the free pack sold whole, ` +
      `up to ${formatEuros(MAX_DAILY_QUIZ_REWARD)} from a clean sweep of the quiz ` +
      `= ${formatEuros(Math.round(income))} a day.`,
  )
  console.log(`Objectives add ${formatEuros(TOTAL_OBJECTIVE_REWARD)} once, across the whole game.\n`)
  for (const pack of PACKS.filter((p) => p.price > 0)) {
    console.log(
      `  ${(pack.price / income).toFixed(1).padStart(5)} days of income to afford one ${pack.name}`,
    )
  }
}

main()
