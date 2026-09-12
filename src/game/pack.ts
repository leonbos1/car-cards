import { CARS } from '../data/cars'
import type { CardView, Pack } from '../types'
import { toCardView } from './rating'

export type Rng = () => number

/** Every car resolved once — ratings are pure functions of authored stats. */
export const ALL_CARDS: CardView[] = CARS.map(toCardView)

const NON_SPECIAL = ALL_CARDS.filter((c) => !c.special)
const SPECIALS = ALL_CARDS.filter((c) => c.special)

function pick<T>(pool: T[], rng: Rng): T {
  return pool[Math.floor(rng() * pool.length)]
}

/**
 * Cards a pack can draw for a normal slot. Specials are excluded here — they
 * only ever arrive through the pack's specialChance roll, so a Chiron can never
 * fall out of a Gold Pack just because it happens to be gold.
 */
export function poolFor(pack: Pack, rare: boolean): CardView[] {
  return NON_SPECIAL.filter(
    (c) =>
      pack.tiers.includes(c.tier) &&
      c.rare === rare &&
      (pack.minOverall === undefined || c.overall >= pack.minOverall),
  )
}

/** Chance a non-guaranteed slot rolls rare, read off the pack's published odds. */
function baseRareChance(pack: Pack): number {
  const rare = pack.odds.rates.find((r) => r.label.startsWith('Rare'))
  return rare ? rare.chance : 0
}

/**
 * Open a pack. Guaranteed rares are filled first, the rest are rolled against
 * the pack's published rare chance, then one special is rolled for the whole
 * pack. `rng` is injectable so tests are deterministic.
 */
export function openPack(pack: Pack, rng: Rng = Math.random): CardView[] {
  const rarePool = poolFor(pack, true)
  const commonPool = poolFor(pack, false)

  const rareChance = baseRareChance(pack)
  const cards: CardView[] = []

  for (let i = 0; i < pack.size; i++) {
    const guaranteed = i < pack.guaranteedRare
    const wantRare = pack.allRare || guaranteed || rng() < rareChance
    // Fall back to the other pool if a tier has no cards of the wanted rarity.
    const pool = wantRare
      ? rarePool.length
        ? rarePool
        : commonPool
      : commonPool.length
        ? commonPool
        : rarePool
    cards.push(pick(pool, rng))
  }

  if (pack.specialChance > 0 && rng() < pack.specialChance && SPECIALS.length) {
    // Replace the weakest card so the special is always an upgrade.
    let worst = 0
    for (let i = 1; i < cards.length; i++) {
      if (cards[i].overall < cards[worst].overall) worst = i
    }
    cards[worst] = pick(SPECIALS, rng)
  }

  // Best card last, so the reveal builds to the walkout instead of opening on it.
  cards.sort((a, b) => a.overall - b.overall)
  return cards
}
