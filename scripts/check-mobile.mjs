/**
 * Fails if any tab scrolls sideways on a phone.
 *
 * This exists because it already happened: adding the Race tab took the nav to
 * 633px against a 360px screen, and nothing caught it — the unit tests do not
 * render, and the layout looked fine on a laptop. A page that scrolls sideways
 * is the one layout bug a player notices immediately, so it gets a check of its
 * own rather than trusting a screenshot taken at whatever width happened to be
 * open at the time.
 *
 * Run with `npm run check:mobile`, which builds first and serves the build.
 */
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const WIDTHS = [360, 390, 430]
const TABS = ['Store', 'Market', 'Race', 'Quiz', 'Objectives', 'Catalog', 'Garage']
const PORT = 4179
const URL = `http://localhost:${PORT}/car-cards/`

/** A save with money and no welcome pack, so every tab has something in it. */
const SAVE = {
  state: {
    balance: 50_000,
    collection: {},
    packsOpened: 0,
    lastFreePackAt: null,
    claimedObjectives: [],
    quizPlayedAt: {},
    boughtListings: [],
    fulfilledContracts: [],
    welcomeClaimed: false,
    racesRun: 0,
    racesWon: 0,
  },
  version: 0,
}

// stdout is discarded, not piped: a pipe nobody reads fills up and vite then
// blocks writing to it and never serves a request. Detached so the whole
// process group can be killed — SIGTERM to `npx` alone leaves the vite process
// it spawned running, and this script would never exit.
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: ['ignore', 'ignore', 'inherit'],
  detached: true,
})

async function waitForServer(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(URL)
      if (res.ok) return
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`vite preview did not come up on ${URL}`)
}

const failures = []

try {
  await waitForServer()
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium',
  })

  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await page.goto(URL, { waitUntil: 'networkidle' })
    await page.evaluate((save) => {
      localStorage.clear()
      localStorage.setItem('car-cards-save-v2', JSON.stringify(save))
    }, SAVE)
    await page.reload({ waitUntil: 'networkidle' })

    for (const tab of TABS) {
      const button = page.getByRole('button', { name: tab, exact: true })
      if (await button.count()) {
        await button.first().click()
        await page.waitForTimeout(300)
      }

      const report = await page.evaluate(() => {
        const doc = document.documentElement
        // Whatever sticks out furthest is the thing to name in the failure.
        let widest = null
        let max = 0
        for (const el of document.querySelectorAll('body *')) {
          const right = el.getBoundingClientRect().right
          if (right > max) {
            max = right
            widest = `${el.tagName.toLowerCase()}.${String(el.className || '').slice(0, 70)}`
          }
        }
        return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, widest, max }
      })

      if (report.scrollWidth > report.clientWidth) {
        failures.push(
          `${tab} at ${width}px scrolls sideways: ${report.scrollWidth}px of content in ` +
            `${report.clientWidth}px. Widest element reaches ${Math.round(report.max)}px — ` +
            `${report.widest}`,
        )
      }
    }
    await page.close()
  }

  await browser.close()
} finally {
  try {
    process.kill(-server.pid, 'SIGTERM')
  } catch {
    server.kill()
  }
}

if (failures.length) {
  console.error('Mobile layout check failed:\n')
  for (const line of failures) console.error(`  ${line}`)
  process.exit(1)
}

console.log(`No horizontal overflow on ${TABS.length} tabs at ${WIDTHS.join('px, ')}px.`)
process.exit(0)
