import { bookValue } from './economy'
import { ALL_CARDS } from './pack'
import type { CardView, Tier } from '../types'

/**
 * Standing requests from bot buyers: hand over a car that fits and take the fee.
 *
 * This is the one thing to do that is not on a 24-hour clock and does not need
 * capital. A car out of the free pack can fill a contract in the first minute,
 * which is the whole point — everything else the game offered a new player was
 * either timed out, one-time, or priced beyond an empty wallet.
 *
 * Generated from a time window exactly like `listings()` in `market.ts`: stable
 * while it is on the board, changes on its own schedule, and stores nothing.
 */

/** How many requests stand at once. */
export const CONTRACT_COUNT = 3
/** How often the board turns over. */
export const CONTRACT_REFRESH_MS = 12 * 60 * 60 * 1000

/**
 * What a buyer pays, against the middle of what qualifies.
 *
 * Pricing against the *cheapest* qualifying car was tried and is wrong: one
 * €11 car satisfies "a rare German car", so loose requests paid nothing.
 * Pricing as a multiple of whatever you hand over is worse — it rewards
 * stripping your best cars, and at hypercar values one request would pay
 * €30.000. Against the median, handing over the cheapest thing that fits is
 * the good play, which is a decision worth making.
 */
const PREMIUM = 1.15
/**
 * Keeps a demanding request from becoming a way to launder exotica — and keeps
 * the whole activity a supplement rather than a firehose. Contracts unbounded
 * at 8-hourly and 1.45x paid €8.779 a day on their own, which on top of the
 * shortened pack and quiz timers cut a top car from a 28-day chase to six days.
 */
const REWARD_CAP = 2_500
const REWARD_FLOOR = 250

const TRADEABLE = ALL_CARDS.filter((c) => !c.special)

/** Countries carry ISO codes on the card; a request has to read as English. */
const COUNTRY_NAMES: Record<string, string> = {
  JP: 'Japanese', DE: 'German', IT: 'Italian', US: 'American', IN: 'Indian',
  GB: 'British', KR: 'Korean', CN: 'Chinese', FR: 'French', CZ: 'Czech',
  ES: 'Spanish', SE: 'Swedish', RO: 'Romanian', MY: 'Malaysian', RU: 'Russian',
}

/** Marques with enough cars that a request for one is reasonable to fill. */
const BIG_MAKES = [...new Set(TRADEABLE.map((c) => c.make))]
  .filter((make) => TRADEABLE.filter((c) => c.make === make).length >= 12)
  .sort()

const BIG_COUNTRIES = Object.keys(COUNTRY_NAMES).filter(
  (code) => TRADEABLE.filter((c) => c.country === code).length >= 20,
)

export interface ContractWant {
  make?: string
  country?: string
  tier?: Tier
  rare?: boolean
  minOverall?: number
}

export interface Contract {
  /** Stable for as long as the request is on the board. */
  id: string
  want: ContractWant
  /** What the buyer is asking for, in words. */
  label: string
  reward: number
}

/** Same hash as the market, avalanche included — see market.ts. */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h ^= h >>> 16
  h = Math.imul(h, 2246822507)
  h ^= h >>> 13
  h = Math.imul(h, 3266489909)
  h ^= h >>> 16
  return (h >>> 0) / 0x100000000
}

const pick = <T,>(items: T[], roll: number): T => items[Math.floor(roll * items.length)]

export function contractWindow(now = Date.now()): number {
  return Math.floor(now / CONTRACT_REFRESH_MS)
}

export function nextContractsIn(now = Date.now()): number {
  return CONTRACT_REFRESH_MS - (now % CONTRACT_REFRESH_MS)
}

export function matchesWant(card: CardView, want: ContractWant): boolean {
  if (card.special) return false // specials are never asked for, or handed over
  if (want.make && card.make !== want.make) return false
  if (want.country && card.country !== want.country) return false
  if (want.tier && card.tier !== want.tier) return false
  if (want.rare && !card.rare) return false
  if (want.minOverall !== undefined && card.overall < want.minOverall) return false
  return true
}

export function qualifying(want: ContractWant): CardView[] {
  return TRADEABLE.filter((c) => matchesWant(c, want))
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

export function rewardFor(want: ContractWant): number {
  const pool = qualifying(want)
  if (!pool.length) return 0
  const mid = median(pool.map(bookValue))
  return Math.round(Math.min(REWARD_CAP, Math.max(REWARD_FLOOR, mid * PREMIUM)))
}

/**
 * Requests always pair a subject with a rating floor. A bare "any Ferrari" can
 * be filled with the cheapest Ferrari in the game, which makes the fee free
 * money; asking for a standard as well is what keeps it a real errand.
 */
const article = (word: string) => (/^[AEIOU]/i.test(word) ? 'An' : 'A')

/**
 * Ease the rating floor until something actually qualifies.
 *
 * Plenty of marques have nothing above 85, and a request nobody can fill is
 * both a dead row and a broken promise. Relaxing beats dropping the row: the
 * board should always be full.
 */
function withReachableFloor(want: ContractWant, floors: number[]): ContractWant {
  for (const floor of floors) {
    const candidate = { ...want, minOverall: floor }
    if (qualifying(candidate).length) return candidate
  }
  return { ...want, minOverall: undefined }
}

/**
 * A request an ordinary garage can fill.
 *
 * The specific asks — "any Toyota rated 80 or better" — are satisfied by a
 * dozen cars out of a thousand, so a new player with 28 cars matched none of
 * them and the whole feature was dead for the people who need it most. One slot
 * is always kept for something broad. It pays less, because the median of a
 * wide pool is lower, which is the right shape: an easy errand, a smaller fee.
 */
function buildBroad(seed: string): ContractWant & { label: string } {
  const roll = hash(`broad:${seed}`)
  if (roll < 0.45) {
    const tier: Tier = roll < 0.22 ? 'silver' : 'gold'
    return { tier, label: `Any ${tier} car` }
  }
  if (roll < 0.75) {
    const country = pick(BIG_COUNTRIES, hash(`bcountry:${seed}`))
    const name = COUNTRY_NAMES[country]
    return { country, label: `${article(name)} ${name} car, anything considered` }
  }
  const floor = pick([70, 75], hash(`bfloor:${seed}`))
  return { minOverall: floor, label: `Anything rated ${floor} or better` }
}

function build(seed: string): ContractWant & { label: string } {
  const shape = hash(`shape:${seed}`)
  const asked = pick([70, 75, 80, 85], hash(`floor:${seed}`))
  // Try what was asked for first, then walk down.
  const floors = [asked, ...[85, 80, 75, 70].filter((f) => f < asked)]

  if (shape < 0.4) {
    const make = pick(BIG_MAKES, hash(`make:${seed}`))
    const want = withReachableFloor({ make }, floors)
    return {
      ...want,
      label: want.minOverall
        ? `Any ${make} rated ${want.minOverall} or better`
        : `Any ${make}`,
    }
  }
  if (shape < 0.75) {
    const country = pick(BIG_COUNTRIES, hash(`country:${seed}`))
    const name = COUNTRY_NAMES[country]
    const want = withReachableFloor({ country }, floors)
    return {
      ...want,
      label: want.minOverall
        ? `${article(name)} ${name} car rated ${want.minOverall} or better`
        : `${article(name)} ${name} car`,
    }
  }
  const tier: Tier = hash(`tier:${seed}`) < 0.5 ? 'silver' : 'gold'
  return { tier, rare: true, label: `A rare ${tier} car` }
}

/** The requests standing right now. */
export function contracts(now = Date.now()): Contract[] {
  const window = contractWindow(now)
  const out: Contract[] = []
  for (let slot = 0; slot < CONTRACT_COUNT; slot++) {
    const seed = `${window}:${slot}`
    // Slot zero is always something an ordinary garage can satisfy.
    const { label, ...want } = slot === 0 ? buildBroad(seed) : build(seed)
    out.push({ id: seed, want, label, reward: rewardFor(want) })
  }
  return out
}

/** Most a player can earn from contracts in a day, if they fill every one. */
export const MAX_DAILY_CONTRACT_REWARD =
  CONTRACT_COUNT * REWARD_CAP * (86_400_000 / CONTRACT_REFRESH_MS)
