/**
 * Lists what Commons actually holds for the cars that have no image, so a human
 * can pin the right file (Car.imageFile) or correct the car's name.
 *
 * Prints candidates WITHOUT the depicts() gate — the point is to see what is
 * there, including files the gate rejects.
 *
 * Run with `npx tsx scripts/suggest-images.ts`.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CARS } from '../src/data/cars'
import type { CarImage } from '../src/types'
import { depicts } from './image-match'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST = path.join(ROOT, 'src', 'data', 'car-images.json')
const API = 'https://commons.wikimedia.org/w/api.php'
const UA = 'car-cards-image-fetch/1.0 (https://github.com/leonbos1/car-cards)'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function search(query: string): Promise<{ title: string; width: number }[]> {
  const params = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search',
    gsrsearch: `${query} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '12',
    prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '960',
  })
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${API}?${params}`, { headers: { 'User-Agent': UA } })
    const body = await res.text()
    if (res.ok) {
      try {
        const data = JSON.parse(body) as {
          query?: { pages?: Record<string, { title?: string; imageinfo?: { width?: number }[] }> }
        }
        return Object.values(data.query?.pages ?? {}).map((p) => ({
          title: (p.title ?? '').replace(/^File:/, ''),
          width: p.imageinfo?.[0]?.width ?? 0,
        }))
      } catch { /* rate-limit notices arrive as text with a 200 */ }
    }
    await sleep(1500 * 2 ** attempt)
  }
  return []
}

async function main() {
  const manifest: Record<string, CarImage> = JSON.parse(await readFile(MANIFEST, 'utf8'))
  const missing = CARS.filter((c) => !manifest[c.id])

  console.log(`${missing.length} cars without an image\n`)

  for (const car of missing) {
    console.log(`### ${car.id}  (${car.make} ${car.model}, ${car.year})`)
    const seen = new Set<string>()
    for (const query of [`${car.make} ${car.model}`, car.model, car.imageQuery]) {
      for (const hit of await search(query)) {
        if (seen.has(hit.title) || hit.width < 700) continue
        seen.add(hit.title)
        console.log(`   ${depicts(hit.title, car) ? 'PASS' : '    '} ${hit.title}`)
      }
      await sleep(300)
    }
    if (!seen.size) console.log('   (nothing on Commons)')
    console.log()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
