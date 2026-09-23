/**
 * Screenshots every screen at phone and desktop width, from a seeded save.
 *
 * Unit tests do not render, and a layout checked at whatever width a laptop
 * happened to be at is how the nav once scrolled a phone sideways. This takes
 * the same pictures every time — same save, same widths — and flags the two
 * things a player notices first: a page that scrolls sideways, and errors.
 *
 *   npm run shots -- --url http://localhost:5173/car-cards/ --out /tmp/shots
 *   npm run shots -- --tabs race,garage --widths 360 --fresh
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
const widths = arg('widths', '360,390,1280').split(',').map(Number)
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
const warnings: string[] = []

for (const width of widths) {
  const phone = width < 700
  const height = phone ? 780 : 900
  // Phone widths run as a real touch device, so `pointer: coarse` styles — the
  // larger tap targets — are what gets photographed and measured.
  const context = await browser.newContext({
    viewport: { width, height },
    ...(phone && { isMobile: true, hasTouch: true }),
  })
  await context.addInitScript((s) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('car-cards-save-v2', s)
      sessionStorage.setItem('seeded', '1')
    }
  }, save)

  for (const tab of tabs) {
    // A fresh page per screen. Playwright's `fullPage` screenshot quietly drops
    // touch emulation for the rest of a page's life, which had every screen
    // after the first measured — and photographed — with mouse-sized controls.
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => {
      // The favicon probe 404s on some servers and says nothing about the screen.
      if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text())
    })
    await page.goto(`${url}#/${tab}`)
    await page.waitForTimeout(700)
    const { scroll, docHeight } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      docHeight: document.documentElement.scrollHeight,
    }))
    if (scroll > 0) problems.push(`${tab} @${width}px scrolls sideways by ${scroll}px`)
    if (phone) {
      // Anything tappable shorter than 40px is a missed tap waiting to happen.
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('button, a[href], [role="tab"], input, select')]
          .filter((el) => {
            const r = el.getBoundingClientRect()
            return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && r.height < 40
          })
          .map((el) => `"${(el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 28)}" ${Math.round(el.getBoundingClientRect().height)}px`),
      )
      if (small.length) warnings.push(`${tab} @${width}px: ${small.length} tap target(s) under 40px — ${small.slice(0, 6).join(', ')}`)
    }
    // Stretch the viewport to the page instead of using `fullPage`, which keeps
    // the emulation intact and draws fixed bars where they really sit.
    await page.setViewportSize({ width, height: Math.min(Math.max(docHeight, height), 2400) })
    await page.waitForTimeout(150)
    const file = path.join(out, `${width}-${tab}.png`)
    await page.screenshot({ path: file })
    console.log(`  ${file}`)
    for (const e of errors) problems.push(`${tab} @${width}px: ${e}`)
    await page.close()
  }
  await context.close()
}
await browser.close()

if (warnings.length) console.log(`\n${warnings.length} warning(s):\n  ${warnings.join('\n  ')}`)
if (problems.length) {
  console.log(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}`)
  process.exitCode = 1
} else {
  console.log('\nNo sideways scroll, no errors.')
}
