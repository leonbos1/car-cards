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
import { FREE_PACK_COOLDOWN_MS, STARTING_BALANCE, formatEuros, quickSellValue } from '../src/game/economy'
import { openPack, slotPool } from '../src/game/pack'
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
    for (const card of openPack(pack, seeded(seed * 2654435761))) total += quickSellValue(card)
  }
  return total / runs
}

function main() {
  console.log(`starting balance ${formatEuros(STARTING_BALANCE)}`)
  console.log(`free pack every ${FREE_PACK_COOLDOWN_MS / 3_600_000}h\n`)

  console.log('pack             price      sell value   return   best possible   smallest pool')
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
      `${pack.name.padEnd(16)} ${formatEuros(pack.price).padStart(9)}  ` +
        `${formatEuros(Math.round(ev)).padStart(10)}   ` +
        `${(pack.price ? `${(ret * 100).toFixed(0)}%` : '—').padStart(6)}   ` +
        `${String(ceiling).padStart(13)}   ${String(smallestPool).padStart(13)}`,
    )
  }

  console.log('\ncontents')
  for (const pack of PACKS) console.log(`  ${pack.name.padEnd(16)} ${contentsLine(pack)}`)

  const daily = expectedValue(PACKS.find((p) => p.free)!)
  console.log(`\nDaily pack yields about ${formatEuros(Math.round(daily))} a day if sold whole.`)
  for (const pack of PACKS.filter((p) => p.price > 0)) {
    console.log(
      `  ${(pack.price / daily).toFixed(1).padStart(5)} days of dailies to afford one ${pack.name}`,
    )
  }
}

main()
