/**
 * Checks every manifest entry against the car it is supposed to show.
 *
 * The fetch script scored a name match as a bonus rather than a requirement, so
 * any wide, high-resolution file could win a search that matched nothing at all
 * — a landscape painting outscored the bar on aspect ratio alone. This reads the
 * Commons filename back for each card and reports what does not line up.
 *
 * Run with `npx tsx scripts/audit-images.ts`, or `--json` for the fix list.
 */
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CARS } from '../src/data/cars'
import type { Car, CarImage } from '../src/types'
import { looksLikeACar, matchCar } from './image-match'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST = path.join(ROOT, 'src', 'data', 'car-images.json')

export type Verdict = 'ok' | 'wrong-model' | 'wrong-car' | 'no-image'

/** The Commons filename, decoded, without the File: prefix or extension. */
export function fileNameOf(image: CarImage): string {
  const fromUrl = image.sourceUrl.split('/').pop() ?? ''
  const raw = decodeURIComponent(fromUrl).replace(/^File:/, '') || image.file
  return raw.replace(/\.(jpe?g|png|webp|gif|tiff?)$/i, '').replace(/_/g, ' ')
}

export function verdictFor(car: Car, image: CarImage | undefined): Verdict {
  if (!image) return 'no-image'
  const name = fileNameOf(image)
  // Same gate the fetcher and the test use, so the three cannot disagree.
  if (!looksLikeACar(name)) return 'wrong-car'
  const m = matchCar(name, car)
  if (!m.make) return 'wrong-car'
  if (!m.model && !m.modelUncheckable) return 'wrong-model'
  return 'ok'
}

export async function readManifest(): Promise<Record<string, CarImage>> {
  if (!existsSync(MANIFEST)) return {}
  return JSON.parse(await readFile(MANIFEST, 'utf8'))
}

export async function audit() {
  const manifest = await readManifest()
  const buckets: Record<Verdict, { car: Car; file: string }[]> = {
    ok: [], 'wrong-model': [], 'wrong-car': [], 'no-image': [],
  }
  for (const car of CARS) {
    const image = manifest[car.id]
    buckets[verdictFor(car, image)].push({ car, file: image ? fileNameOf(image) : '—' })
  }
  const stale = Object.keys(manifest).filter((id) => !CARS.some((c) => c.id === id))
  return { buckets, stale }
}

async function main() {
  const { buckets, stale } = await audit()

  if (process.argv.includes('--json')) {
    const broken = [...buckets['wrong-car'], ...buckets['wrong-model'], ...buckets['no-image']]
    console.log(JSON.stringify(broken.map(({ car, file }) => ({
      id: car.id, make: car.make, model: car.model, year: car.year, got: file,
    })), null, 2))
    return
  }

  for (const key of ['wrong-car', 'wrong-model', 'no-image'] as Verdict[]) {
    const rows = buckets[key]
    if (!rows.length) continue
    console.log(`\n=== ${key.toUpperCase()} (${rows.length}) ===`)
    for (const { car, file } of rows) {
      console.log(`  ${car.id}\n      wants: ${car.make} ${car.model}\n      got:   ${file}`)
    }
  }

  console.log(`\n--- Summary of ${CARS.length} cars ---`)
  console.log(`  correct:     ${buckets.ok.length}`)
  console.log(`  wrong model: ${buckets['wrong-model'].length}`)
  console.log(`  wrong car:   ${buckets['wrong-car'].length}`)
  console.log(`  no image:    ${buckets['no-image'].length}`)
  console.log(`  stale manifest entries: ${stale.length}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
