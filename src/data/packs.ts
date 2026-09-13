import type { Pack } from '../types'

/**
 * Single free pack to make supercars extremely rare.
 * Contains: 1 gold, 4 silver, 3 bronze
 */
export const PACKS: Pack[] = [
  {
    id: 'daily-free',
    name: 'Daily Free Pack',
    price: 0,
    size: 8,
    tiers: ['gold', 'silver', 'silver', 'silver', 'silver', 'bronze', 'bronze', 'bronze'],
    guaranteedRare: 0,
    specialChance: 0,
    art: 'gold',
    odds: {
      contents: '8 cars: 1 gold, 4 silver, 3 bronze',
      rates: [
        { label: 'Gold', chance: 0.125 },
        { label: 'Silver', chance: 0.5 },
        { label: 'Bronze', chance: 0.375 },
      ],
    },
  },
]

export const PACK_BY_ID = new Map(PACKS.map((p) => [p.id, p]))
