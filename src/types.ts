export type Tier = 'bronze' | 'silver' | 'gold'

/** How a card is drawn. Specials get their own treatment on top of the three tiers. */
export type CardClass = Tier | 'special'

/** The six-stat row, mirroring FIFA's PAC/SHO/PAS/DRI/DEF/PHY. */
export interface Stats {
  /** Acceleration */
  acc: number
  /** Top speed */
  spd: number
  /** Power-to-weight */
  pwr: number
  /** Handling */
  han: number
  /** Braking */
  brk: number
  /** Style / desirability */
  sty: number
}

export interface Specs {
  hp: number
  /** 0-100 km/h in seconds */
  zeroToHundred: number
  /** km/h */
  topSpeed: number
  weightKg: number
}

export interface Special {
  /** Printed across the card, e.g. 'LIMITED EDITION' */
  label: string
  /** Units built, printed on the card when known */
  limitedTo?: number
}

export interface Car {
  id: string
  make: string
  model: string
  year: number
  /** ISO 3166-1 alpha-2, used for the flag on the card */
  country: string
  stats: Stats
  /** Authored, not derived: rarity is about character, not just speed. */
  rare: boolean
  special?: Special
  specs: Specs
  /** Wikimedia Commons search string used by scripts/fetch-images.ts */
  imageQuery: string
  /**
   * Pins an exact Commons file ('Ferrari F40.jpg') when search relevance picks a
   * detail shot, a race version, or the wrong generation.
   */
  imageFile?: string
}

export interface CarImage {
  file: string
  artist: string
  license: string
  sourceUrl: string
}

/** A car resolved with its computed rating, tier and card class. */
export interface CardView extends Car {
  overall: number
  tier: Tier
  cardClass: CardClass
}

export interface PackOdds {
  /** Human-readable contents line shown in the store. */
  contents: string
  /** Per-slot drop rates, keyed by what can come out. Rendered verbatim. */
  rates: { label: string; chance: number }[]
}

export interface Pack {
  id: string
  name: string
  price: number
  /** Number of cards in the pack. */
  size: number
  /** Tiers a slot can roll. */
  tiers: Tier[]
  /** Minimum number of rare cards guaranteed. */
  guaranteedRare: number
  /** Chance per pack of one slot upgrading to a special card. */
  specialChance: number
  /** Minimum overall rating for every card (Prime Gold's 82+ floor). */
  minOverall?: number
  /** Every card must be rare (Rare Players Pack). */
  allRare?: boolean
  /** Card class used for the pack artwork. */
  art: CardClass
  odds: PackOdds
}

/** One card pulled from a pack, tagged with whether it was already owned. */
export interface Pull {
  card: CardView
  isNew: boolean
}
