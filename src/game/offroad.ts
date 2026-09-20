import type { CardView } from '../types'

export type DriveTrain = 'FWD' | 'RWD' | 'AWD' | '4WD'

export interface OffroadSpecs {
  driveTrain: DriveTrain
  groundClearanceMm: number
  tyreSize: string
}

/**
 * The roster was authored with four performance numbers per car (hp, 0-100,
 * top speed, weight) and nothing about its chassis. Drivetrain, ride height
 * and tyre size are inferred from the name and from power-to-weight — the
 * same signal the rating curve already uses to tell a hot hatch from a
 * shopping car — rather than hand-entered per car, which isn't feasible for
 * 1,100+ vehicles and would mostly be guesswork anyway. Treat these as
 * plausible estimates for flavour, not verified factory specs.
 */

// Same FNV-1a hash as market.ts and contracts.ts, so a car's offroad specs are
// picked once and never drift between renders or sessions.
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function clampToStep(value: number, min: number, max: number, step: number): number {
  return Math.round(clamp(value, min, max) / step) * step
}

/** Brands that build almost nothing but trucks and off-roaders. */
const OFFROAD_BRANDS = new Set(['Jeep', 'Land Rover', 'Range Rover', 'Hummer', 'Ram', 'Rivian', 'GMC'])

/** Brands that put all-wheel drive on nearly everything they sell. */
const AWD_BRANDS = new Set(['Subaru', 'Bugatti', 'Rimac', 'Lamborghini'])

const OFFROAD_NAME = /\b(suv|pickup|pick-up|truck|4x4|wrangler|defender|discovery|range rover|cayenne|urus|bentayga|land cruiser|rav4|cr-?v|explorer|tahoe|suburban|yukon|silverado|sierra|f-?150|f-?250|ranger|hilux|grand cherokee|4runner|bronco|xc90|xc60|q7|q8|macan|touareg|tiguan|santa fe|pathfinder|patrol|jimny|amarok|navara|colorado|d-max|triton|outlander|cx-5|cx-9|forester|crosstrek|tucson|sportage|telluride|palisade|atlas|kodiaq|kuga|edge|expedition|armada|sequoia|g-class|g63|g60|g500|raptor|cybertruck|escalade|navigator|land rover|x-trail|rogue|kicks|creta|venue|seltos|sorento|santa cruz|ridgeline|pilot|passport)\b/i

const AWD_NAME = /\b(quattro|xdrive|4matic|4motion|awd|all-wheel|sti|wrx|evo|evolution|gt-r|gtr|synchro)\b/i

/** A handful of well-known AWD nameplates that don't advertise it in the name. */
function hasAwdException(make: string, model: string): boolean {
  if (make === 'Volkswagen' && /\bgolf r\b/i.test(model)) return true
  if (make === 'Audi' && /\b(rs\s?\d\w*|s[3-8]\b|r8)\b/i.test(model)) return true
  // The 993 generation (1995) is when the 911 Turbo switched to all-wheel
  // drive; the earlier 930-era cars in the roster stayed rear-drive.
  return false
}

function isTurboAllWheelDrive911(make: string, model: string, year: number): boolean {
  return make === 'Porsche' && /turbo/i.test(model) && year >= 1995
}

/**
 * A handful of famous hot hatches that stay front-wheel drive no matter how
 * much power they carry — the power-to-weight fallback below would otherwise
 * read a Civic Type R the same as a mid-engined supercar and call it RWD.
 */
const FWD_HOT_HATCH = /\b(type r|golf gti|clubsport|megane rs|clio rs|208 gti|corsa gsi|fiesta st|focus st|i30 n|leon cupra|civic si)\b/i

function classifyDriveTrain(car: CardView, powerToWeight: number, isOffroad: boolean): DriveTrain {
  if (isOffroad) return '4WD'
  if (AWD_BRANDS.has(car.make)) return 'AWD'
  if (AWD_NAME.test(`${car.make} ${car.model}`)) return 'AWD'
  if (hasAwdException(car.make, car.model)) return 'AWD'
  if (isTurboAllWheelDrive911(car.make, car.model, car.year)) return 'AWD'
  if (FWD_HOT_HATCH.test(car.model)) return 'FWD'
  // Above this line, power outruns weight enough that a live rear axle or a
  // mid/rear engine is the usual real-world answer. Below it, front-wheel
  // drive is the economical default most of the roster actually uses.
  return powerToWeight > 0.16 ? 'RWD' : 'FWD'
}

function deriveGroundClearance(car: CardView, isOffroad: boolean, powerToWeight: number): number {
  const jitter = (hash(`${car.id}:clearance`) - 0.5) * 26
  if (isOffroad) return Math.round(clamp(205 + jitter, 170, 260))
  const base = 150 - Math.min(65, powerToWeight * 170)
  return Math.round(clamp(base + jitter, 85, 165))
}

function deriveTyreSize(car: CardView, isOffroad: boolean, powerToWeight: number): string {
  const jitterWidth = hash(`${car.id}:tyre-width`) - 0.5
  const jitterDiameter = hash(`${car.id}:tyre-diameter`) - 0.5

  let width = 175 + Math.min(140, powerToWeight * 420) + jitterWidth * 20
  let diameter = 15 + Math.min(7, powerToWeight * 18) + jitterDiameter * 1.6
  if (isOffroad) {
    width += 15
    diameter = Math.max(diameter, 16.5)
  }

  const roundedWidth = clampToStep(width, 145, 335, 5)
  const roundedDiameter = Math.round(clamp(diameter, 13, 23))
  const aspect = clampToStep(70 - (roundedDiameter - 14) * 3 - powerToWeight * 40, 25, 75, 5)

  return `${roundedWidth}/${aspect} R${roundedDiameter}`
}

/** Estimated offroad-relevant specs for a car: drivetrain, ride height, tyres. */
export function deriveOffroadSpecs(car: CardView): OffroadSpecs {
  const isOffroad = OFFROAD_BRANDS.has(car.make) || OFFROAD_NAME.test(`${car.make} ${car.model}`)
  const powerToWeight = car.stats.hp / car.stats.weight

  return {
    driveTrain: classifyDriveTrain(car, powerToWeight, isOffroad),
    groundClearanceMm: deriveGroundClearance(car, isOffroad, powerToWeight),
    tyreSize: deriveTyreSize(car, isOffroad, powerToWeight),
  }
}
