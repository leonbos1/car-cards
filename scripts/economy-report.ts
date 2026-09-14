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
  CONTRACT_COUNT,
  CONTRACT_REFRESH_MS,
  MAX_DAILY_CONTRACT_REWARD,
  contracts,
} from '../src/game/contracts'
import {
  FREE_PACK_COOLDOWN_MS,
  QUICK_SELL_RATE,
  STARTING_BALANCE,
  bookValue,
  formatEuros,
} from '../src/game/economy'
import { bidPrice } from '../src/game/market'
import { TOTAL_OBJECTIVE_REWARD } from '../src/game/objectives'
import { ALL_CARDS, openPack, slotPool } from '../src/game/pack'
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
      `${pack.name.padEnd(20)} ${formatEuros(pack.price).padStart(11)}  ` +
        `${formatEuros(Math.round(ev)).padStart(13)}   ` +
        `${(pack.price ? `${(ret * 100).toFixed(0)}%` : '—').padStart(6)}   ` +
        `${String(ceiling).padStart(13)}   ${String(smallestPool).padStart(13)}`,
    )
  }

  console.log('\ncontents')
  for (const pack of PACKS) console.log(`  ${pack.name.padEnd(20)} ${contentsLine(pack)}`)

  // The repeatable pack is the daily one; the welcome pack is a one-off and
  // must not be mistaken for income.
  const freePack = PACKS.find((p) => p.free && !p.once)!
  const packsPerDay = 86_400_000 / FREE_PACK_COOLDOWN_MS
  const fromPacks = expectedValue(freePack) * packsPerDay

  // What a board actually pays, averaged over many windows — the cap is the
  // ceiling, not the going rate.
  let fees = 0
  let posted = 0
  for (let w = 0; w < 500; w++) {
    for (const c of contracts(w * CONTRACT_REFRESH_MS)) {
      fees += c.reward
      posted++
    }
  }
  const boardsPerDay = 86_400_000 / CONTRACT_REFRESH_MS
  const fromContracts = (fees / posted) * CONTRACT_COUNT * boardsPerDay

  const income = fromPacks + MAX_DAILY_QUIZ_REWARD + fromContracts
  console.log(
    `\nDaily income, playing flawlessly:\n` +
      `  ${formatEuros(Math.round(fromPacks)).padStart(9)}  ${packsPerDay.toFixed(1)}x ${
        freePack.name
      } sold whole\n` +
      `  ${formatEuros(MAX_DAILY_QUIZ_REWARD).padStart(9)}  a clean sweep of every quiz category\n` +
      `  ${formatEuros(Math.round(fromContracts)).padStart(9)}  ${boardsPerDay.toFixed(
        1,
      )} contract boards filled (ceiling ${formatEuros(MAX_DAILY_CONTRACT_REWARD)})\n` +
      `  ${formatEuros(Math.round(income)).padStart(9)}  total`,
  )
  console.log(`Objectives add ${formatEuros(TOTAL_OBJECTIVE_REWARD)} once, across the whole game.\n`)
  for (const pack of PACKS.filter((p) => p.price > 0)) {
    console.log(
      `  ${(pack.price / income).toFixed(1).padStart(5)} days of income to afford one ${pack.name}`,
    )
  }
  const topCar = Math.max(...ALL_CARDS.filter((c) => !c.special).map(bookValue))
  console.log(
    `  ${(topCar / income).toFixed(1).padStart(5)} days of income to afford the best car in the ` +
      `game (${formatEuros(topCar)})`,
  )
}

main()
