/**
 * Decides whether a Wikimedia Commons file actually depicts a given car.
 *
 * The fetch script, the audit and the test all import this, so a rule that
 * rejects a photo at fetch time is the same rule that fails the build later.
 *
 * The bar is deliberately blunt: the marque has to be named in the filename,
 * and so does something distinctive about the model. Commons search relevance
 * on its own will happily hand back a painting for an obscure Alfa.
 */
import type { Car } from '../src/types'

/** Commons spells a marque several ways; any of these names it. */
const MAKE_ALIASES: Record<string, string[]> = {
  volkswagen: ['volkswagen', 'vw'],
  'mercedes-benz': ['mercedes', 'benz'],
  mercedes: ['mercedes', 'benz'],
  'mercedes-amg': ['mercedes', 'benz', 'amg'],
  'mercedes-maybach': ['maybach', 'mercedes'],
  chevrolet: ['chevrolet', 'chevy'],
  'alfa romeo': ['alfa'],
  'aston martin': ['aston'],
  'land rover': ['landrover', 'rover', 'defender', 'discovery', 'freelander'],
  'range rover': ['rangerover', 'rover', 'range'],
  'rolls-royce': ['rolls', 'royce'],
  vauxhall: ['vauxhall', 'opel', 'holden'],
  opel: ['opel', 'vauxhall'],
  maruti: ['maruti', 'suzuki'],
  'maruti suzuki': ['maruti', 'suzuki'],
  'great wall': ['haval', 'greatwall'],
  acura: ['acura', 'honda'],
  infiniti: ['infiniti', 'nissan'],
  lexus: ['lexus', 'toyota'],
  genesis: ['genesis', 'hyundai'],
  cupra: ['cupra', 'seat'],
  seat: ['seat', 'cupra'],
  skoda: ['skoda'],
  citroen: ['citroen'],
  ds: ['ds', 'citroen'],
  abarth: ['abarth', 'fiat'],
  'shelby': ['shelby', 'ford'],
  'hennessey': ['hennessey'],
  'morris': ['morris', 'mini', 'leyland', 'austin'],
  // Marques Commons files me under another name entirely.
  'force motors': ['force'],
  'li auto': ['lixiang', 'liauto'],
  datsun: ['datsun', 'nissan'],
  huawei: ['huawei', 'aito', 'seres'],
  wuling: ['wuling'],
  tvs: ['tvs'],
  // Geely files its EVs under the Geometry sub-brand, with no 'Geely' in sight.
  geely: ['geely', 'geometry'],
}

/**
 * Files that are plainly not photographs of a vehicle, whatever words they
 * share with a car. Commons is an archive of everything, so a search for an
 * obscure model surfaces engravings, maps and paintings that happen to match a
 * word — this is the backstop that keeps them off a card.
 */
const NOT_A_CAR = [
  /\bEB1911\b|encyclopa|\bfig\.?\s*\d/i,
  /\bLCCN\b|\bLOC\b|\bNYPL\b|\bmanuscript\b|\bengraving\b|\bwoodcut\b|\blithograph\b/i,
  /\bpainting\b|\bportrait\b|\bthe death of\b|\bseal of\b|\bcoat of arms\b/i,
  /\bmap\b|\bchart of\b|\bdiagram\b|\bmolecule\b|\b3D-balls\b/i,
  /\btemple\b|\bchurch\b|\bcathedral\b|\bmuseum interior\b/i,
  /\bpostcard\b|\bstamp\b|\bbanknote\b|\bflag of\b/i,
  // Several marques are named after ancient places (Tarraco, Cordoba, Toledo),
  // so a search for the car lands squarely in the archaeology collection.
  /\blageplan\b|\bgrundriss\b|\bplan of\b|\bsite plan\b|\bkarte\b/i,
  /\bstatue\b|\bmosaic\b|\binscription\b|\bsarcophagus\b|\bamphitheat|\baqueduct\b/i,
  /\bruins?\b|\bexcavation\b|\bfresco\b|\brelief\b|\bnecropolis\b|\bforum\b/i,
]

export function looksLikeACar(title: string): boolean {
  const name = title.replace(/^File:/, '')
  return !NOT_A_CAR.some((re) => re.test(name))
}

/**
 * Model names that double as ordinary words, so finding one in a filename
 * proves nothing on its own.
 */
const AMBIGUOUS_MODELS = new Set([
  'beat', 'enjoy', 'focus', 'smart', 'spirit', 'vision', 'one', 'two', 'city',
  'accord', 'legend', 'civic', 'fit', 'note', 'cube', 'soul', 'forte', 'up',
  'element', 'pilot', 'ranger', 'explorer', 'escape', 'journey',
])

/** Model words too generic to prove the photo shows the right model. */
const GENERIC = new Set([
  'gt', 'gts', 'gti', 'gtd', 'gte', 'gtr', 'rs', 'st', 'se', 'sl', 'sport',
  'plus', 'pro', 'max', 'ev', 'hybrid', 'phev', 'tdi', 'tsi', 'tfsi', 'cdi',
  'crdi', 'jtd', 'jts', 'coupe', 'sedan', 'saloon', 'hatchback', 'wagon',
  'estate', 'suv', 'cabrio', 'convertible', 'roadster', 'spider', 'spyder',
  'turbo', 'twin', 'quattro', 'awd', 'fwd', 'rwd', 'xdrive', 'type', 'edition',
  'limited', 'special', 'series', 'new', 'the', 'and', 'mk', 'gen', 'v6', 'v8',
  'v10', 'v12', 'luxury', 'performance', 'premium', 'base', 'line', 'pack',
  'car', 'auto', 'electric', 'diesel', 'petrol', 'cng', 'dark', 'prime',
  'touring', 'flagship', 'racer', 'race', 'proto', 'concept', 'vintage',
])

/** Strip diacritics and case so 'Citroën' and 'Citroen' compare equal. */
function fold(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function tokensOf(text: string): string[] {
  return fold(text).split(/[^a-z0-9]+/).filter(Boolean)
}

/**
 * Commons filenames run words together, and the seams are not always
 * punctuation: 'VectorW8', 'Mazda6', '1956JaguarD-TypeLongNose'. Split on case
 * changes and letter/digit boundaries too, so a short model code like 'W8' is
 * still findable as a word of its own.
 */
function wordsOf(text: string): Set<string> {
  const words = new Set<string>()
  for (const chunk of text.split(/[^A-Za-z0-9]+/).filter(Boolean)) {
    words.add(fold(chunk))
    const pieces = chunk
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Za-z])(\d)/g, '$1 $2')
      .replace(/(\d)([A-Za-z])/g, '$1 $2')
      .split(' ')
    for (const piece of pieces) if (piece) words.add(fold(piece))
    // 'VectorW8' should also yield 'w8', which the split above breaks apart.
    for (const m of chunk.matchAll(/[A-Za-z]\d+/g)) words.add(fold(m[0]))
  }
  return words
}

/** Commons filenames run words together ('Mazda6', '1956JaguarD-Type'). */
function flatten(text: string): string {
  return fold(text).replace(/[^a-z0-9]+/g, '')
}

/**
 * A short name has to stand as its own word — 'ds' and 'mg' would otherwise
 * match half the dictionary. A longer one may run into its neighbours.
 */
function present(needle: string, words: Set<string>, flat: string): boolean {
  if (needle.length <= 3) return words.has(needle)
  return flat.includes(needle)
}

export function makeNamesFor(make: string): string[] {
  const key = fold(make)
  return MAKE_ALIASES[key] ?? [flatten(make)]
}

/** Model words distinctive enough that finding one proves the right model. */
export function modelNamesFor(model: string): string[] {
  const words = tokensOf(model).filter((w) => !GENERIC.has(w))
  // A pure number ('62', '156') only counts alongside the make, which is
  // already required, so keep it. Drop single letters, which match anything.
  return words.filter((w) => w.length > 1)
}

export interface Match {
  make: boolean
  model: boolean
  /** True when the model name carries nothing distinctive to check. */
  modelUncheckable: boolean
}

/** `title` is a Commons filename, with or without the File: prefix. */
export function matchCar(title: string, car: Car): Match {
  const name = title.replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '')
  const words = wordsOf(name)
  const flat = flatten(name)

  const make = makeNamesFor(car.make).some((n) => present(n, words, flat))
  const modelNames = modelNamesFor(car.model)
  const model = modelNames.some((n) => present(n, words, flat))

  // Uploaders often drop the marque when the model name already says it —
  // 'Mk6 And Mk7 Fiesta's', '71 Corvette ZR-2'. A long, unambiguous model name
  // stands in for the make; a word like 'Beat' or 'One' never does.
  const namesTheCar = modelNames.some(
    (n) => n.length >= 5 && !AMBIGUOUS_MODELS.has(n) && present(n, words, flat),
  )

  return { make: make || namesTheCar, model, modelUncheckable: modelNames.length === 0 }
}

/** The whole point: is this file allowed to represent this car at all? */
export function depicts(title: string, car: Car): boolean {
  if (!looksLikeACar(title)) return false
  const m = matchCar(title, car)
  return m.make && (m.model || m.modelUncheckable)
}
