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
      (pack.minOverall === undefined || c.overall >= pack.minOverall) &&
      (pack.maxOverall === undefined || c.overall <= pack.maxOverall),
  )
}

/**
 * Cards allowed in one particular slot.
 *
 * Each slot has its own tier, so a pack advertising three bronze and one gold
 * deals exactly that. Treating `tiers` as a set instead — which is what this
 * used to do — meant the free pack drew all eight cards from the combined pool,
 * where gold outnumbers bronze seven to one, and a hypercar could fall out of
 * the pack you get for nothing.
 *
 * A marque pack narrows its first `makeSlots` slots to one brand; the slots
 * after that stay open, which is what makes it *at least* three of the marque.
 */
export function slotPool(pack: Pack, slot: number, rare: boolean): CardView[] {
  // Pools are a pure function of the pack and the roster, and openPack asks for
  // them once per slot per open — thousands of times over in the tests. Without
  // this cache every one of those is a full scan of a thousand cards.
  let cached = SLOT_POOLS.get(pack)
  if (!cached) SLOT_POOLS.set(pack, (cached = new Map()))
  const key = `${slot}:${rare}`
  const hit = cached.get(key)
  if (hit) return hit

  const tier = pack.tiers[slot]
  // The last slot is the headline card, revealed last, so it can carry a floor.
  const isLast = slot === pack.tiers.length - 1
  const floor = Math.max(
    pack.minOverall ?? 0,
    isLast ? (pack.headlinerMinOverall ?? 0) : 0,
  )
  const brandOnly = pack.make !== undefined && slot < (pack.makeSlots ?? 0)
  const pool = NON_SPECIAL.filter(
    (c) =>
      c.tier === tier &&
      c.rare === rare &&
      c.overall >= floor &&
      (pack.maxOverall === undefined || c.overall <= pack.maxOverall) &&
      (!brandOnly || c.make === pack.make),
  )
  cached.set(key, pool)
  return pool
}

// Keyed on the pack object rather than its id, so a pack built on the fly in a
// test can never collide with one in the ladder.
const SLOT_POOLS = new WeakMap<Pack, Map<string, CardView[]>>()

/**
 * Open a pack. Guaranteed rares are filled first, the rest are rolled against
 * the pack's published rare chance, then one special is rolled for the whole
 * pack. `rng` is injectable so tests are deterministic.
 */
export function openPack(pack: Pack, rng: Rng = Math.random): CardView[] {
  const cards: CardView[] = []
  const taken = new Set<string>()

  for (let i = 0; i < pack.tiers.length; i++) {
    const guaranteed = i < pack.guaranteedRare
    const wantRare = pack.allRare || guaranteed || rng() < pack.rareChance
    const rares = slotPool(pack, i, true)
    const commons = slotPool(pack, i, false)
    // An all-rare pack must never reach for a common; everything else may fall
    // back to the other pool rather than repeat a card it has already given.
    const pools = pack.allRare ? [rares] : wantRare ? [rares, commons] : [commons, rares]
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
