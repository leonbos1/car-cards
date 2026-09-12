/**
 * Fetches one freely-licensed photograph per car from Wikimedia Commons into
 * public/cars/, and records attribution in src/data/car-images.json.
 *
 * CC BY-SA requires attribution, so every downloaded photo keeps its author,
 * license and source page — the card detail view and CREDITS.md render them.
 *
 * Idempotent: cars that already have a webp on disk are skipped, so reruns only
 * fetch what is missing. Run with `npm run fetch:images`.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { CARS } from '../src/data/cars'
import type { Car, CarImage } from '../src/types'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'public', 'cars')
const MANIFEST = path.join(ROOT, 'src', 'data', 'car-images.json')
const CREDITS = path.join(ROOT, 'CREDITS.md')

const API = 'https://commons.wikimedia.org/w/api.php'
// Commons asks every automated client to identify itself.
const UA = 'car-cards-image-fetch/1.0 (https://github.com/leonbos1/car-cards)'

/** Licenses we accept. Anything else is skipped rather than guessed at. */
const ALLOWED = [
  'cc0',
  'cc by',
  'cc by-sa',
  'public domain',
  'pd-',
  'cc-by',
  'cc-zero',
]

interface ImageInfo {
  thumburl?: string
  descriptionurl?: string
  width?: number
  height?: number
  extmetadata?: Record<string, { value?: string }>
}

interface Candidate {
  title: string
  info: ImageInfo
}

/**
 * Commons search relevance is noisy: a query for a road car happily returns a
 * close-up of its wheel, a race-liveried version, or the wrong generation.
 * These titles are penalised so a plain photo of the whole car wins.
 */
const TITLE_PENALTIES: [RegExp, number][] = [
  [/\b(interior|cockpit|dashboard|dash|seat|engine|motor)\b/i, -60],
  [/\b(wheel|tyre|tire|brake|badge|logo|emblem|headlamp|headlight|taillight|grille|detail|bonnet|hood)\b/i, -60],
  [/\b(rally|racing|race|wrc|dtm|gt3|gt2|gte|lmp|nascar|circuit|motorsport|safety car|police|taxi)\b/i, -45],
  [/\b(rear|back)\b/i, -12],
  [/\b(crash|wreck|abandoned|rusty|scrap|junk)\b/i, -70],
  [/\b(museum|showroom|dealership)\b/i, -5],
  // Body-style variants that are not the car the card is about.
  [/\b(fourgonnette|camionnette|van|pickup|pick-up|truck|estate|kombi|cabrio|convertible)\b/i, -30],
]

const TITLE_BONUSES: [RegExp, number][] = [
  [/\bfront\b/i, 14],
  [/\b(3\/4|three[- ]quarter)\b/i, 10],
]

function isAllowed(license: string): boolean {
  const l = license.toLowerCase()
  return ALLOWED.some((a) => l.startsWith(a))
}

/** Commons puts HTML in the Artist field; the card only wants the name. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Commons rate-limits bursts of anonymous requests and answers with a plain-text
 * body rather than JSON, so a failure here is usually "slow down", not "no such
 * car". Back off and retry instead of writing the car off.
 */
async function getJson(url: string, attempts = 4): Promise<unknown> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    const body = await res.text()
    if (res.ok) {
      try {
        return JSON.parse(body)
      } catch {
        // Rate-limit notices come back as text with a 200, so fall through.
      }
    }
    if (attempt < attempts - 1) await sleep(2000 * 2 ** attempt)
  }
  throw new Error('Commons API kept refusing (rate limited?)')
}

async function search(query: string): Promise<Candidate[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '20',
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '960',
  })
  const data = (await getJson(`${API}?${params}`)) as {
    query?: { pages?: Record<string, { title?: string; imageinfo?: ImageInfo[] }> }
  }
  return Object.values(data.query?.pages ?? {}).flatMap((p) =>
    (p.imageinfo ?? []).map((info) => ({ title: p.title ?? '', info })),
  )
}

/** Higher is better. Negative scores are rejected outright. */
function score(candidate: Candidate, car: Car): number {
  const title = candidate.title.replace(/^File:/, '')
  const { width = 0, height = 0 } = candidate.info
  let total = 0

  for (const [re, penalty] of TITLE_PENALTIES) if (re.test(title)) total += penalty
  for (const [re, bonus] of TITLE_BONUSES) if (re.test(title)) total += bonus

  // Every significant word of the make and model that shows up in the filename.
  const words = `${car.make} ${car.model}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1)
  const haystack = title.toLowerCase()
  for (const word of words) if (haystack.includes(word)) total += 12

  // A whole car in frame is wider than it is tall; a square crop is a detail shot.
  const ratio = height ? width / height : 0
  if (ratio >= 1.2 && ratio <= 2.2) total += 18
  else if (ratio > 2.2) total -= 10
  else total -= 25

  if (width >= 1600) total += 8
  if (width < 800) total -= 20

  return total
}

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`download failed: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await sharp(buf)
    .resize(960, 640, { fit: 'cover', position: 'centre' })
    .webp({ quality: 82 })
    .toFile(dest)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const manifest: Record<string, CarImage> = existsSync(MANIFEST)
    ? JSON.parse(await readFile(MANIFEST, 'utf8'))
    : {}

  const failed: string[] = []

  for (const car of CARS) {
    const file = `${car.id}.webp`
    const dest = path.join(OUT_DIR, file)
    if (existsSync(dest) && manifest[car.id]) {
      console.log(`· ${car.id} (cached)`)
      continue
    }

    try {
      const query = car.imageFile ? `insource:"${car.imageFile}"` : car.imageQuery
      const results = await search(car.imageFile ?? car.imageQuery)

      const allowed = results.filter((c) => {
        const license = c.info.extmetadata?.LicenseShortName?.value ?? ''
        return c.info.thumburl && isAllowed(license)
      })

      // A pinned file wins outright; otherwise take the best-scoring candidate.
      const pinned = car.imageFile
        ? allowed.find((c) => c.title.replace(/^File:/, '') === car.imageFile)
        : undefined
      const best =
        pinned ??
        allowed
          .map((c) => ({ c, s: score(c, car) }))
          .sort((a, b) => b.s - a.s)
          .filter(({ s }) => s > 0)
          .map(({ c }) => c)[0]

      const usable = best?.info
      void query

      if (!usable?.thumburl) {
        console.warn(`✗ ${car.id}: no usable image for "${car.imageQuery}"`)
        failed.push(car.id)
        continue
      }

      await download(usable.thumburl, dest)
      manifest[car.id] = {
        file,
        artist: stripHtml(usable.extmetadata?.Artist?.value ?? 'Unknown'),
        license: usable.extmetadata?.LicenseShortName?.value ?? 'Unknown',
        sourceUrl: usable.descriptionurl ?? '',
      }
      console.log(`✓ ${car.id}  ${manifest[car.id].license}`)
    } catch (err) {
      console.warn(`✗ ${car.id}: ${(err as Error).message}`)
      failed.push(car.id)
    }

    await sleep(400)
  }

  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`)

  const rows = CARS.filter((c) => manifest[c.id])
    .map((c) => {
      const m = manifest[c.id]
      const source = m.sourceUrl ? `[Commons](${m.sourceUrl})` : '—'
      return `| ${c.make} ${c.model} | ${m.artist} | ${m.license} | ${source} |`
    })
    .join('\n')

  await writeFile(
    CREDITS,
    `# Photo credits\n\n` +
      `Every car photograph in this project comes from [Wikimedia Commons](https://commons.wikimedia.org)\n` +
      `under a free licence. Attribution is required by CC BY and CC BY-SA, and is shown in-app on\n` +
      `each card's detail view.\n\n` +
      `| Car | Photographer | Licence | Source |\n| --- | --- | --- | --- |\n${rows}\n`,
  )

  console.log(
    `\nDone. ${Object.keys(manifest).length}/${CARS.length} cars have images.` +
      (failed.length ? ` Missing: ${failed.join(', ')}` : ''),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
