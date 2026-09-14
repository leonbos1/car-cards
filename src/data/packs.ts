import { toCardView } from '../game/rating'
import type { Pack, Tier } from '../types'
import { CARS } from './cars'

/** `slots(3, 'bronze')` reads better than writing the tier out three times. */
function slots(...groups: [count: number, tier: Tier][]): Tier[] {
  return groups.flatMap(([count, tier]) => Array<Tier>(count).fill(tier))
}

/**
 * The pack ladder.
 *
 * Two rules hold it together. Every paid pack is priced well above what its
 * contents quick-sell for, so buying and selling is a way to spend money on
 * cars, never a way to make it — `economy.test.ts` measures this and fails the
 * build if a price drifts into profit. And the best cars are kept scarce by
 * where they can appear at all rather than by long odds: cheap packs carry a
 * maxOverall ceiling, so no amount of opening Bronze Packs will ever produce a
 * hypercar. You have to go and buy the pack that deals them.
 */
const LADDER: Pack[] = [
  {
    // The first thing a new player ever sees. It exists because the game used
    // to open on an empty garage with €3.000 and half the store greyed out —
    // and because a starting collection is what makes the market and the
    // buyers' requests usable in the first minute rather than on day three.
    id: 'welcome',
    name: 'Welcome Pack',
    price: 0,
    free: true,
    once: true,
    tiers: slots([8, 'bronze'], [9, 'silver'], [3, 'gold']),
    guaranteedRare: 1,
    rareChance: 0.12,
    specialChance: 0,
    maxOverall: 84,
    art: 'gold',
    blurb: 'Twenty cars to get you started. Once only.',
  },
  {
    id: 'daily-free',
    name: 'Daily Pack',
    price: 0,
    free: true,
    tiers: slots([3, 'bronze'], [4, 'silver'], [1, 'gold']),
    guaranteedRare: 0,
    rareChance: 0.06,
    specialChance: 0,
    // The free pack pays the bills; it does not hand out the good stuff.
    maxOverall: 84,
    art: 'silver',
    blurb: 'Free every 8 hours. Sell what you do not want.',
  },
  {
    id: 'bronze',
    name: 'Bronze Pack',
    price: 400,
    tiers: slots([5, 'bronze']),
    guaranteedRare: 0,
    rareChance: 0.14,
    specialChance: 0,
    art: 'bronze',
    blurb: 'Five bronze cars. Cheap volume for the collection.',
  },
  {
    id: 'silver',
    name: 'Silver Pack',
    price: 1_000,
    tiers: slots([5, 'silver']),
    guaranteedRare: 1,
    rareChance: 0.1,
    specialChance: 0,
    art: 'silver',
    blurb: 'Five silver cars, at least one rare.',
  },
  {
    id: 'gold',
    name: 'Gold Pack',
    price: 3_500,
    tiers: slots([1, 'silver'], [4, 'gold']),
    guaranteedRare: 1,
    rareChance: 0.3,
    specialChance: 0,
    maxOverall: 87,
    art: 'gold',
    blurb: 'Four gold cars, rated up to 87.',
  },
  {
    id: 'premium-gold',
    name: 'Premium Gold',
    price: 12_000,
    tiers: slots([8, 'gold']),
    guaranteedRare: 3,
    rareChance: 0.4,
    specialChance: 0.004,
    maxOverall: 92,
    headlinerMinOverall: 86,
    art: 'gold',
    blurb: 'Eight gold cars, three rare, one rated 86 or better.',
  },
]

// There is deliberately no supercar or hypercar pack. Once a 99 is worth five
// figures, a pack that deals five of them cannot be priced: cheap enough to be
// worth buying and it prints money, dear enough to be safe and nobody buys it.
// Cars above the Premium Gold ceiling are bought on the market instead, one at
// a time and at full price, which is what makes owning one mean something.

/**
 * Marque packs.
 *
 * One pack per brand deep enough to fill it, all at the same price: at least
 * three cars of the marque, then three open gold slots. They exist because the
 * collection is organised by brand and the objectives are too — chasing fifteen
 * Alfas out of packs that deal the whole roster is a slog, and this is the way
 * to go after one marque on purpose.
 *
 * Two consequences of the rating cap are worth stating, because they are what
 * keep the scarcity rules intact:
 *
 * - No marque pack can reach a car worth more than it costs. Everything rated
 *   95 or better books above €10.000, so the cap has to sit below that; at 92
 *   the dearest card a pack can deal is €4.088.
 * - The supercar marques get no pack at all. Ferrari, Lamborghini, Pagani and
 *   the rest have fewer than `MIN_MARQUE_GOLD` cars under the cap, so they fall
 *   out of the list on their own rather than by a hand-written exclusion. A
 *   €10.000 Ferrari pack would have been exactly the cheap route to exotica
 *   that removing the supercar packs was meant to close.
 */
export const MARQUE_PACK_PRICE = 10_000

/**
 * The rating ceiling. One below the level the market keeps to itself, and the
 * highest a pack reaches anywhere in the game — a marque pack buys focus, not
 * raw power, so it deals no better a card than Premium Gold does.
 */
export const MARQUE_PACK_CAP = 92

/** Cards per pack, and how many of them are guaranteed to be the marque. */
export const MARQUE_PACK_SIZE = 6
export const MARQUE_PACK_SLOTS = 3

/**
 * Gold cars under the cap a marque needs before it gets a pack. Comfortably
 * more than the pack deals, so three brand slots never scrape the bottom of a
 * pool or repeat a car.
 */
const MIN_MARQUE_GOLD = 8

/** Gold cars each marque has that a marque pack could actually deal. */
export const MARQUE_GOLD = (() => {
  const counts = new Map<string, number>()
  for (const car of CARS) {
    if (car.special) continue
    const card = toCardView(car)
    if (card.tier !== 'gold' || card.overall > MARQUE_PACK_CAP) continue
    counts.set(car.make, (counts.get(car.make) ?? 0) + 1)
  }
  return counts
})()

export const MARQUE_PACKS: Pack[] = [...MARQUE_GOLD.entries()]
  .filter(([, gold]) => gold >= MIN_MARQUE_GOLD)
  .map(([make]) => make)
  .sort((a, b) => a.localeCompare(b))
  .map((make) => ({
    id: `marque-${make.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: `${make} Pack`,
    price: MARQUE_PACK_PRICE,
    tiers: slots([MARQUE_PACK_SIZE, 'gold']),
    make,
    makeSlots: MARQUE_PACK_SLOTS,
    // The guarantees land on the brand slots, so the marque cards are the rare
    // ones rather than the filler.
    guaranteedRare: 2,
    rareChance: 0.3,
    specialChance: 0,
    maxOverall: MARQUE_PACK_CAP,
    // The floor sits on the last slot, which is open — so a marque whose own
    // best car is an 84 still deals one card worth walking out for, and the
    // guarantee is the same whichever brand you buy.
    headlinerMinOverall: 88,
    art: 'gold',
    blurb: `At least three ${make} cars, and one card rated 88 or better.`,
  }))

/** Every pack in the game. The store shows the ladder and the marques apart. */
export const PACKS: Pack[] = [...LADDER, ...MARQUE_PACKS]

export { LADDER }

export const PACK_BY_ID = new Map(PACKS.map((p) => [p.id, p]))

/** How many of each tier a pack deals — the store's drop rates, from the slots. */
export function tierBreakdown(pack: Pack): { tier: Tier; count: number }[] {
  const order: Tier[] = ['gold', 'silver', 'bronze']
  return order
    .map((tier) => ({ tier, count: pack.tiers.filter((t) => t === tier).length }))
    .filter((row) => row.count > 0)
}

/** The contents line shown in the store, built from what the pack actually deals. */
export function contentsLine(pack: Pack): string {
  const parts = tierBreakdown(pack).map(({ tier, count }) => `${count} ${tier}`)
  return `${pack.tiers.length} cars — ${parts.join(', ')}`
}
