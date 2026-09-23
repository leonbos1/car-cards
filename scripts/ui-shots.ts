/**
 * Screenshots every screen at phone and desktop width, from a seeded save.
 *
 * Unit tests do not render, and a layout checked at whatever width a laptop
 * happened to be at is how the nav once scrolled a phone sideways. This takes
 * the same pictures every time — same save, same widths — and flags the two
 * things a player notices first: a page that scrolls sideways, and errors.
 *
 *   npm run shots -- --url http://localhost:5173/car-cards/ --out /tmp/shots
 *   npm run shots -- --tabs race,garage --widths 390 --fresh
 *
 * --fresh seeds a brand-new player (empty garage, welcome pack waiting)
 * instead of a mid-game one, for checking first-run and empty states.
 */
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { ALL_CARDS } from '../src/game/pack'

const ALL_TABS = ['store', 'market', 'race', 'garage', 'catalog', 'objectives', 'quiz', 'clicker', 'settings']

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}

const url = arg('url', 'http://localhost:5173/car-cards/')
const out = arg('out', path.resolve('shots'))
const tabs = arg('tabs', ALL_TABS.join(',')).split(',')
const widths = arg('widths', '390,1280').split(',').map(Number)
const fresh = process.argv.includes('--fresh')

// A mid-game garage: a slice of every tier, a few specials, money to spend.
const midGame = {
  balance: 48_250,
  packsOpened: 23,
  welcomeClaimed: true,
  collection: Object.fromEntries(
    ALL_CARDS.filter((c, i) => i % 7 === 0 || (c.special && i % 3 === 0)).map((c, i) => [c.id, 1 + (i % 4 === 0 ? 1 : 0)]),
  ),
}
const newPlayer = { balance: 5_000, packsOpened: 0, welcomeClaimed: false, collection: {} }
const save = JSON.stringify({ state: fresh ? newPlayer : midGame, version: 0 })

// The container ships a Chromium that can be older than the Playwright pinned
// here; point at it rather than downloading.
const executablePath =
  process.env.CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)

mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath })
const problems: string[] = []

for (const width of widths) {
  const page = await browser.newPage({ viewport: { width, height: width < 700 ? 844 : 900 } })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    // The favicon probe 404s on every page and says nothing about the screen.
    if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text())
  })
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('car-cards-save-v2', s)
      sessionStorage.setItem('seeded', '1')
    }
  }, save)

  for (const tab of tabs) {
    await page.goto(`${url}#/${tab}`)
    await page.waitForTimeout(700)
    const { scroll, height } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      height: document.documentElement.scrollHeight,
    }))
    if (scroll > 0) problems.push(`${tab} @${width}px scrolls sideways by ${scroll}px`)
    const file = path.join(out, `${width}-${tab}.png`)
    await page.screenshot({ path: file, fullPage: true, clip: { x: 0, y: 0, width, height: Math.min(height, 2400) } })
    console.log(`  ${file}`)
  }
  for (const e of errors) problems.push(`@${width}px: ${e}`)
  await page.close()
}
await browser.close()

if (problems.length) {
  console.log(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}`)
  process.exitCode = 1
} else {
  console.log('\nNo sideways scroll, no errors.')
}
