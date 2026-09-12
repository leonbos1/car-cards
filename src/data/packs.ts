import type { Pack } from '../types'

/**
 * Prices are lifted straight from the FUT coin store. Sizes are not: FIFA's
 * 12/24/30-card packs assume thousands of players, and a gold-only pack that
 * big would have to hand out the same car three times over a 20-car gold pool.
 * Each pack is sized to what its pool can fill with distinct cars instead.
 *
 * Each pack's `odds` block is what the store renders, and the same numbers on
 * the pack drive openPack — they cannot drift apart.
 */
export const PACKS: Pack[] = [
  {
    id: 'bronze',
    name: 'Bronze Pack',
    price: 400,
    size: 12,
    tiers: ['bronze'],
    guaranteedRare: 0,
    specialChance: 0,
    art: 'bronze',
    odds: {
      contents: '12 bronze cars',
      rates: [
        { label: 'Bronze', chance: 1 },
        { label: 'Rare', chance: 0.12 },
      ],
    },
  },
  {
    id: 'premium-bronze',
    name: 'Premium Bronze Pack',
    price: 750,
    size: 12,
    tiers: ['bronze'],
    guaranteedRare: 3,
    specialChance: 0,
    art: 'bronze',
    odds: {
      contents: '12 bronze cars, at least 3 rare',
      rates: [
        { label: 'Bronze', chance: 1 },
        { label: 'Rare (guaranteed 3)', chance: 0.25 },
      ],
    },
  },
  {
    id: 'silver',
    name: 'Silver Pack',
    price: 2500,
    size: 12,
    tiers: ['silver'],
    guaranteedRare: 0,
    specialChance: 0,
    art: 'silver',
    odds: {
      contents: '12 silver cars',
      rates: [
        { label: 'Silver', chance: 1 },
        { label: 'Rare', chance: 0.12 },
      ],
    },
  },
  {
    id: 'premium-silver',
    name: 'Premium Silver Pack',
    price: 3750,
    size: 12,
    tiers: ['silver'],
    guaranteedRare: 3,
    specialChance: 0,
    art: 'silver',
    odds: {
      contents: '12 silver cars, at least 3 rare',
      rates: [
        { label: 'Silver', chance: 1 },
        { label: 'Rare (guaranteed 3)', chance: 0.25 },
      ],
    },
  },
  {
    id: 'gold',
    name: 'Gold Pack',
    price: 5000,
    size: 10,
    tiers: ['gold'],
    guaranteedRare: 0,
    specialChance: 0,
    art: 'gold',
    odds: {
      contents: '10 gold cars',
      rates: [
        { label: 'Gold', chance: 1 },
        { label: 'Rare', chance: 0.15 },
      ],
    },
  },
  {
    id: 'premium-gold',
    name: 'Premium Gold Pack',
    price: 7500,
    size: 10,
    tiers: ['gold'],
    guaranteedRare: 3,
    specialChance: 0.02,
    art: 'gold',
    odds: {
      contents: '10 gold cars, at least 3 rare',
      rates: [
        { label: 'Gold', chance: 1 },
        { label: 'Rare (guaranteed 3)', chance: 0.3 },
        { label: 'Special', chance: 0.02 },
      ],
    },
  },
  {
    id: 'jumbo-premium-gold',
    name: 'Jumbo Premium Gold Pack',
    price: 15000,
    size: 16,
    tiers: ['gold'],
    guaranteedRare: 5,
    specialChance: 0.035,
    art: 'gold',
    odds: {
      contents: '16 gold cars, at least 5 rare',
      rates: [
        { label: 'Gold', chance: 1 },
        { label: 'Rare (guaranteed 5)', chance: 0.3 },
        { label: 'Special', chance: 0.035 },
      ],
    },
  },
  {
    id: 'rare-players',
    name: 'Rare Players Pack',
    price: 25000,
    size: 8,
    tiers: ['gold'],
    guaranteedRare: 8,
    allRare: true,
    specialChance: 0.05,
    art: 'gold',
    odds: {
      contents: '8 rare gold cars',
      rates: [
        { label: 'Rare gold', chance: 1 },
        { label: 'Special', chance: 0.05 },
      ],
    },
  },
  {
    id: 'mega',
    name: 'Mega Pack',
    price: 35000,
    size: 18,
    tiers: ['gold'],
    guaranteedRare: 6,
    specialChance: 0.06,
    art: 'gold',
    odds: {
      contents: '18 gold cars, at least 6 rare',
      rates: [
        { label: 'Gold', chance: 1 },
        { label: 'Rare (guaranteed 6)', chance: 0.3 },
        { label: 'Special', chance: 0.06 },
      ],
    },
  },
  {
    id: 'prime-gold',
    name: 'Prime Gold Players Pack',
    price: 50000,
    size: 10,
    tiers: ['gold'],
    guaranteedRare: 4,
    minOverall: 86,
    specialChance: 0.08,
    art: 'gold',
    odds: {
      contents: '10 gold cars rated 86 or higher, at least 4 rare',
      rates: [
        { label: 'Gold 86+', chance: 1 },
        { label: 'Rare (guaranteed 4)', chance: 0.4 },
        { label: 'Special', chance: 0.08 },
      ],
    },
  },
  {
    id: 'rare-mega',
    name: 'Rare Mega Pack',
    price: 55000,
    size: 18,
    tiers: ['gold'],
    guaranteedRare: 8,
    specialChance: 0.09,
    art: 'gold',
    odds: {
      contents: '18 gold cars, at least 8 rare',
      rates: [
        { label: 'Gold', chance: 1 },
        { label: 'Rare (guaranteed 8)', chance: 0.5 },
        { label: 'Special', chance: 0.09 },
      ],
    },
  },
  {
    id: 'ultimate',
    name: 'Ultimate Pack',
    price: 125000,
    size: 20,
    tiers: ['gold'],
    guaranteedRare: 8,
    minOverall: 84,
    specialChance: 0.12,
    art: 'special',
    odds: {
      contents: '20 gold cars rated 84 or higher, at least 8 rare',
      rates: [
        { label: 'Gold 84+', chance: 1 },
        { label: 'Rare (guaranteed 8)', chance: 0.8 },
        { label: 'Special', chance: 0.12 },
      ],
    },
  },
]

export const PACK_BY_ID = new Map(PACKS.map((p) => [p.id, p]))
