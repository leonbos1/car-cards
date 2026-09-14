export type Tier = 'bronze' | 'silver' | 'gold'

/** How a card is drawn. Specials get their own treatment on top of the three tiers. */
export type CardClass = Tier | 'special'

/** Realistic performance metrics from actual car specs */
export interface Stats {
  /** Horsepower (actual HP from engine) */
  hp: number
  /** Acceleration: 0-100 km/h time in seconds */
  acc: number
  /** Top speed in km/h */
  topspeed: number
  /** Weight in kg */
  weight: number
  /** Handling score (1-99 based on power-to-weight and suspension) */
  handling: number
  /** Wow factor / Desirability (1-99 subjective) */
  wowFactor: number
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

export interface Pack {
  id: string
  name: string
  price: number
  /**
   * The tier of each card the pack deals, in order — so the length is the pack
   * size and the composition is the drop rate. The store reads its odds off
   * this same array, which is why what is advertised cannot drift from what is
   * dealt.
   */
  tiers: Tier[]
  /** Minimum number of rare cards guaranteed. */
  guaranteedRare: number
  /** Chance any remaining slot rolls rare. */
  rareChance: number
  /** Chance per pack of one slot upgrading to a special card. */
  specialChance: number
  /** Minimum overall rating for every card (the supercar packs' floor). */
  minOverall?: number
  /**
   * Ceiling on every card's rating. This is what keeps the best cars rare: a
   * cheap pack is capped so a hypercar cannot fall out of it no matter how
   * lucky the roll, rather than relying on a small chance to keep it scarce.
   */
  maxOverall?: number
  /** A floor on the best card only, so a big pack always has a headline car. */
  headlinerMinOverall?: number
  /** Every card must be rare. */
  allRare?: boolean
  /** Card class used for the pack artwork. */
  art: CardClass
  /** Openable once per cooldown rather than bought. */
  free?: boolean
  /** Openable exactly once, ever. The welcome pack. */
  once?: boolean
  /** One line in the store saying what the pack is for. */
  blurb: string
}

/** One card pulled from a pack, tagged with whether it was already owned. */
export interface Pull {
  card: CardView
  isNew: boolean
}
