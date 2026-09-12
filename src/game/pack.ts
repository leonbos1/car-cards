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
 * Draw one card the pack has not produced yet, trying each pool in order of
 * preference. Pulling the same car twice in a single pack reads as a bug rather
 * than bad luck, so a repeat only happens once every pool is exhausted — which,
 * with packs sized to their pools, should not occur at all.
 */
function draw(pools: CardView[][], taken: Set<string>, rng: Rng): CardView {
  for (const pool of pools) {
    const fresh = pool.filter((c) => !taken.has(c.id))
    if (fresh.length) {
      const card = pick(fresh, rng)
      taken.add(card.id)
      return card
    }
  }
  return pick(pools.find((p) => p.length) ?? [], rng)
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
  const taken = new Set<string>()

  for (let i = 0; i < pack.size; i++) {
    const guaranteed = i < pack.guaranteedRare
    const wantRare = pack.allRare || guaranteed || rng() < rareChance
    // An all-rare pack must never reach for a common; everything else may fall
    // back to the other pool rather than repeat a card it has already given.
    const pools = pack.allRare
      ? [rarePool]
      : wantRare
        ? [rarePool, commonPool]
        : [commonPool, rarePool]
    cards.push(draw(pools, taken, rng))
  }

  if (pack.specialChance > 0 && rng() < pack.specialChance && SPECIALS.length) {
    // Replace the weakest card so the special is always an upgrade.
    let worst = 0
    for (let i = 1; i < cards.length; i++) {
      if (cards[i].overall < cards[worst].overall) worst = i
    }
    cards[worst] = draw([SPECIALS], taken, rng)
  }

  // Best card last, so the reveal builds to the walkout instead of opening on it.
  cards.sort((a, b) => a.overall - b.overall)
  return cards
}
