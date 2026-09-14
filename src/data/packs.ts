import type { Pack, Tier } from '../types'

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
export const PACKS: Pack[] = [
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
    blurb: 'Free every 24 hours. Sell what you do not want.',
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
