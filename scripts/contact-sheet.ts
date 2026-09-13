/**
 * Builds an HTML contact sheet of car photos next to the names they are filed
 * under, so a human can see at a glance whether a card shows its car.
 *
 * Filename checks catch a painting; only looking catches a photo of the right
 * marque but the wrong shape.
 *
 * `npx tsx scripts/contact-sheet.ts [ids…]` — with no ids, shows every car.
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CARS } from '../src/data/cars'
import type { CarImage } from '../src/types'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST = path.join(ROOT, 'src', 'data', 'car-images.json')
const OUT = path.join(ROOT, 'contact-sheet.html')

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

async function main() {
  const manifest: Record<string, CarImage> = JSON.parse(await readFile(MANIFEST, 'utf8'))
  const ids = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  const cars = ids.length ? CARS.filter((c) => ids.includes(c.id)) : CARS

  const cells = cars.map((car) => {
    const image = manifest[car.id]
    const source = image
      ? decodeURIComponent(image.sourceUrl.split('/').pop() ?? '').replace(/_/g, ' ')
      : 'NO IMAGE'
    const img = image
      ? `<img src="public/cars/${esc(image.file)}" loading="lazy" alt="">`
      : `<div class="none">no photo</div>`
    return `<figure>
      ${img}
      <figcaption>
        <b>${esc(car.make)} ${esc(car.model)}</b>
        <span>${car.year}</span>
        <em${image ? '' : ' class="bad"'}>${esc(source)}</em>
      </figcaption>
    </figure>`
  })

  await writeFile(
    OUT,
    `<!doctype html><meta charset="utf-8"><title>Car photo contact sheet</title>
<style>
  body { margin:0; padding:16px; background:#12161f; color:#e8ecf4;
         font:13px/1.4 ui-sans-serif, system-ui, sans-serif; }
  h1 { font-size:16px; margin:0 0 12px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; }
  figure { margin:0; background:#1b2130; border-radius:8px; overflow:hidden; }
  img, .none { width:100%; height:140px; object-fit:cover; display:block; background:#0d1017; }
  .none { display:flex; align-items:center; justify-content:center; color:#8894ab; }
  figcaption { padding:7px 9px; display:grid; gap:2px; }
  b { font-size:12px; }
  span { color:#8894ab; font-size:11px; }
  em { color:#6f7c95; font-size:10px; font-style:normal; word-break:break-word; }
  em.bad { color:#ff8f8f; }
</style>
<h1>${cars.length} cars — photo vs. the name it is filed under</h1>
<div class="grid">${cells.join('')}</div>`,
  )
  console.log(`wrote ${OUT} (${cars.length} cars)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
