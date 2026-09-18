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
import { CARS } from '../src/data/cars'
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
  // A card shows a whole car. An interior is the right car and still the wrong
  // photograph, and the give-away is often not in English: 'Innenraum' carried
  // no penalty at all, so an Audi S4 card ended up showing a dashboard.
  /\binnenraum\b|\binterieur\b|\bint(e|é)rieur\b|\bcockpit\b|\bdashboard\b|\binstrument panel\b/i,
  /\bwn(e|ę)trze\b|\binterni\b|\binterno\b|\bsalpicadero\b|\bbinnenkant\b/i,
  /\bengine bay\b|\bengine compartment\b|\bmotorraum\b|\bchassis\b|\bcutaway\b/i,
  // Press photography from a launch or a factory visit: the marque is in the
  // title, the car is not in the frame. This is how two men in suits ended up
  // on the Xiaomi card.
  /\bvisits?\b|\bdirector general\b|\bchairman\b|\bceo\b|\bpress conference\b/i,
  /\bceremony\b|\bsigning\b|\bdelegation\b|\bsummit\b|\bplenary\b|\bexhibition stand\b/i,
  // A wreck is the right car and still the wrong photograph. This was only a
  // scoring penalty, which loses to nothing at all: a Model X that had been
  // driven into a lamp post, cones and all, won the Long Range card because it
  // was the only candidate left standing.
  /\bcrash(ed)?\b|\bwreck(ed|age)?\b|\bcollision\b|\baccident\b|\bburn(t|ed)\b|\bfire\b/i,
  /\bdamaged\b|\bsalvage\b|\bscrap(yard|ped)?\b|\bjunk(yard)?\b|\btotaled\b|\bunfall\b/i,
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

/**
 * Model words distinctive enough that finding one proves the right model.
 *
 * Three rounds, each looser than the last, because dropping every weak word
 * used to leave some models with nothing to check at all — and a model with
 * nothing to check accepted any photo of the marque. That is how a 1999 RX-7
 * ended up on the Mazda 2 Turbo card and a Mustang on the Ford GT: 'turbo' and
 * 'GT' are generic, '2' was thrown away for being a single character, and the
 * card was left asking only for 'a Mazda' or 'a Ford'.
 *
 * So a bare number or letter is now kept when it is all the model has. It has
 * to match as a whole word rather than as a substring — `present` already
 * insists on that for anything this short — so 'Mazda 2' wants a standalone
 * '2' and does not find one in 'Mazda RX-7 Turbo'.
 */
export function modelNamesFor(model: string): string[] {
  const words = tokensOf(model)
  const distinctive = words.filter((w) => !GENERIC.has(w) && w.length > 1)
  if (distinctive.length) return distinctive
  // Nothing long and distinctive: fall back to short non-generic words ('2',
  // '5', 'Z'), then to the generic ones, which at least name the trim.
  const short = words.filter((w) => !GENERIC.has(w))
  return short.length ? short : words
}

/**
 * Model names belonging to other cars of the same marque.
 *
 * The last line of defence for a model whose own name proves nothing — an
 * 'AMG GT' or a 'Ford GT' is all generic words. Those cards cannot say what
 * they are, but the roster can say what they are not: if the filename names a
 * different model from the same marque, it is not this car.
 */
const SIBLING_NAMES = (() => {
  const byMake = new Map<string, Map<string, Set<string>>>()
  for (const car of CARS) {
    const make = fold(car.make)
    if (!byMake.has(make)) byMake.set(make, new Map())
    const models = byMake.get(make)!
    // The whole model name run together ('cx5', 'panamera') and any long word
    // inside it. The run-together form is what catches a short code: 'cx' and
    // '5' are each too common to trust, 'cx5' is not. Single words shorter
    // than four characters are skipped for the same reason in reverse — 'iV'
    // is a Skoda sub-brand and 'G20' a BMW body code, and every collision
    // throws away a photo that was right.
    const candidates = [flatten(car.model), ...tokensOf(car.model).filter((w) => w.length >= 4)]
    for (const word of candidates) {
      if (GENERIC.has(word) || word.length < 3) continue
      if (!models.has(word)) models.set(word, new Set())
      models.get(word)!.add(fold(car.model))
    }
  }
  return byMake
})()

/** True when the filename names a different model from this car's marque. */
export function namesAnotherModel(title: string, car: Car): boolean {
  const siblings = SIBLING_NAMES.get(fold(car.make))
  if (!siblings) return false
  const name = title.replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '')
  const words = wordsOf(name)
  const flat = flatten(name)
  const mine = fold(car.model)
  const ours = new Set([...tokensOf(car.model), flatten(car.model)])
  const flatMine = flatten(car.model)
  for (const [word, models] of siblings) {
    if (ours.has(word)) continue
    // A sibling whose name is contained in ours is not evidence against us:
    // the roster carries both 'F-Type' and 'F-Type R', and every photo of the
    // R names the plain F-Type too. The veto is for a sibling that adds a
    // name we do not have, like the 'Spider' in '4C Spider'.
    if (flatMine.includes(word)) continue
    // A word several models share says nothing about which one this is.
    if ([...models].every((m) => m === mine)) continue
    if (present(word, words, flat)) return true
  }
  return false
}

/**
 * The model year a Commons filename claims, if it claims one.
 *
 * Commons has a strong convention of leading the filename with the model year
 * — '1970 Chevrolet Chevelle SS 396' — and German uploaders write 'Bj. 1972'
 * for the year built. Both say what the car *is*. A date in brackets at the
 * end is usually when the photo was taken, which says nothing about the car,
 * so it is deliberately not read here: a 2024 photograph of a 1970 Chevelle is
 * exactly the photo that card wants.
 */
export function modelYearOf(title: string): [from: number, to: number] | null {
  const name = title.replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '')

  // A range names a whole generation — '(1995-2000)', '2017-2023 Daihatsu
  // Move Custom' — and a card whose year falls inside it is the right car.
  const range = name.match(
    /\b(19[0-9]{2}|20[0-2][0-9])\s*[-–]\s*(19[0-9]{2}|20[0-2][0-9])\b/,
  )
  if (range) return [Number(range[1]), Number(range[2])]

  const built = name.match(/\bBj\.?\s*(19[0-9]{2}|20[0-2][0-9])/i)
  if (built) return [Number(built[1]), Number(built[1])]
  // A year opening a bracket — '(2006)', '(1978 Pontiac Firebird Trans Am)' —
  // describes the subject, and it outranks a year at the front of the name,
  // which on a photo from an event is the year of the event: a file called
  // '2023 Classic Car Show (1978 Pontiac Firebird Trans Am)' is a 1978 car.
  // A full date in brackets — '(2008-07-12)' — is when the shutter went, so
  // the month and day are what tell those two apart.
  const bracketed = name.match(/\((19[0-9]{2}|20[0-2][0-9])(?![\d-])/)
  if (bracketed) return [Number(bracketed[1]), Number(bracketed[1])]
  const leading = name.match(/^\s*(19[0-9]{2}|20[0-2][0-9])\b/)
  if (leading) return [Number(leading[1]), Number(leading[1])]
  return null
}

/**
 * How far a photo's model year may sit from the card's.
 *
 * Wide enough for a facelift or for a car photographed as a late example of
 * its generation, narrow enough to keep the previous shape off the card.
 */
const YEAR_TOLERANCE = 4

/**
 * Words that name a line rather than a car.
 *
 * Long enough to look distinctive and useless for telling two cars apart: every
 * Tesla filename says 'Model', so matching on it counted as proof and let a
 * Model X Plaid photo settle onto the Model X Long Range card. They still count
 * as a match — they are part of the name — just never as the strong kind that
 * outranks a sibling named in the same filename.
 */
const WEAK_NAMES = new Set(['model', 'series', 'class', 'type', 'clase', 'serie'])

export interface Match {
  make: boolean
  model: boolean
  /** True when the model name carries nothing distinctive to check. */
  modelUncheckable: boolean
  /**
   * True when the model was matched on a name long enough to stand on its own.
   * A match on 'Panamera' settles it; one on '2' or '4C' is circumstantial and
   * wants corroborating.
   */
  modelStrong: boolean
}

/**
 * A model named by a bare number or a two-character code has to sit right
 * behind the marque, the way Commons writes it: 'Mazda 2', 'Polestar 3'.
 *
 * Loose, a lone digit is everywhere in a filename — engine size, model year,
 * and Commons' own '(2)' suffix on a duplicate upload — which is how a CX-5
 * satisfied a card asking for a Mazda 2 three times over.
 */
function followsTheMake(needle: string, car: Car, flat: string): boolean {
  // Either order: Commons writes both 'Mazda 2' and 'SJ Duesenberg'.
  return makeNamesFor(car.make).some(
    (make) => flat.includes(`${make}${needle}`) || flat.includes(`${needle}${make}`),
  )
}

/** `title` is a Commons filename, with or without the File: prefix. */
export function matchCar(title: string, car: Car): Match {
  const name = title.replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '')
  const words = wordsOf(name)
  const flat = flatten(name)

  const make = makeNamesFor(car.make).some((n) => present(n, words, flat))
  const modelNames = modelNamesFor(car.model)
  const hit = (n: string) =>
    // A short code counts as its own word, or run onto the marque the way
    // Commons writes it — 'Mazda 2', 'SJ Duesenberg'.
    n.length <= 2 ? words.has(n) || followsTheMake(n, car, flat) : present(n, words, flat)
  const model = modelNames.some(hit)
  const modelStrong = modelNames.some((n) => n.length >= 3 && !WEAK_NAMES.has(n) && hit(n))

  // Uploaders often drop the marque when the model name already says it —
  // 'Mk6 And Mk7 Fiesta's', '71 Corvette ZR-2'. A long, unambiguous model name
  // stands in for the make; a word like 'Beat' or 'One' never does.
  const namesTheCar = modelNames.some(
    (n) => n.length >= 5 && !AMBIGUOUS_MODELS.has(n) && present(n, words, flat),
  )

  return {
    make: make || namesTheCar,
    model,
    modelUncheckable: modelNames.length === 0,
    modelStrong,
  }
}

/** The whole point: is this file allowed to represent this car at all? */
export function depicts(title: string, car: Car): boolean {
  if (!looksLikeACar(title)) return false

  // A named model year far from the card's is the wrong generation, however
  // well the words line up: a 2010 Roadster is not the 2023 one.
  const years = modelYearOf(title)
  if (years !== null) {
    const [from, to] = years
    if (car.year < from - YEAR_TOLERANCE || car.year > to + YEAR_TOLERANCE) return false
  }

  const m = matchCar(title, car)
  if (!m.make) return false

  // A model name long enough to stand on its own settles it, even if the
  // filename mentions a sibling somewhere — 'Toyota MF10 2000GT Roadster' is a
  // 2000GT whatever else is in the title.
  if (m.modelStrong) return true

  // Otherwise the evidence is circumstantial: a bare '2', or nothing at all.
  // Then a different model of the same marque in the filename is decisive.
  // 'Mazda 2' looks for a standalone '2', and 'Mazda CX-5 … Sport AWD 2022
  // (2).jpg' offers three — the engine size, the year, and Commons' own
  // suffix on a duplicate upload.
  return (m.model || m.modelUncheckable) && !namesAnotherModel(title, car)
}
