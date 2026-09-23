import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useRef, useState } from 'react'
import { CardDetail } from './components/CardDetail'
import { Catalog } from './components/Catalog'
import { Clicker } from './components/Clicker'
import { Garage } from './components/Garage'
import { Market } from './components/Market'
import { Objectives } from './components/Objectives'
import { PackOpening } from './components/PackOpening'
import { PackStore } from './components/PackStore'
import { Quiz } from './components/Quiz'
import { Race } from './components/Race'
import { Settings } from './components/Settings'
import { BottomNav, SideRail, TopBar } from './components/shell/Chrome'
import { hubOf, useHashTab, type Hub, type HubId, type Tab } from './components/shell/nav'
import { useBadges } from './components/shell/useBadges'
import { SubTabs } from './components/ui/SubTabs'
import { FREE_PACK_COOLDOWN_MS } from './game/economy'
import { ALL_CARDS, openPack } from './game/pack'
import { useGame } from './store/useGame'
import type { CardView, Pack, Pull } from './types'

interface Opening {
  pack: Pack
  pulls: Pull[]
}

/**
 * How wide each screen's column runs. Set per screen by the shell rather than
 * by each screen, so every page shares one set of gutters — and so a hub's
 * sub-tabs and the screen under them always line up.
 */
const WIDTH: Record<Tab, string> = {
  store: 'max-w-6xl',
  market: 'max-w-6xl',
  race: 'max-w-5xl',
  garage: 'max-w-7xl',
  catalog: 'max-w-7xl',
  objectives: 'max-w-4xl',
  quiz: 'max-w-4xl',
  clicker: 'max-w-4xl',
  settings: 'max-w-3xl',
}

const TOTAL_CARS = ALL_CARDS.length

export function App() {
  const balance = useGame((s) => s.balance)
  const collection = useGame((s) => s.collection)
  const packsOpened = useGame((s) => s.packsOpened)
  const buy = useGame((s) => s.buy)
  const claimFreePack = useGame((s) => s.claimFreePack)
  const claimWelcomePack = useGame((s) => s.claimWelcomePack)
  const welcomeClaimed = useGame((s) => s.welcomeClaimed)
  const lastFreePackAt = useGame((s) => s.lastFreePackAt)
  const add = useGame((s) => s.add)
  const sellOne = useGame((s) => s.sellOne)
  const sellDuplicates = useGame((s) => s.sellDuplicates)

  // Derived from the subscribed timestamp so the store re-renders when the
  // free pack is taken, rather than reading a snapshot that never updates.
  const freeReadyIn = lastFreePackAt
    ? Math.max(0, Math.min(FREE_PACK_COOLDOWN_MS, lastFreePackAt + FREE_PACK_COOLDOWN_MS - Date.now()))
    : 0

  const [tab, setTab] = useHashTab()
  const [opening, setOpening] = useState<Opening | null>(null)
  const [inspecting, setInspecting] = useState<CardView | null>(null)
  const badges = useBadges()
  const reduceMotion = useReducedMotion()

  // Going back to a hub returns to the screen you last had open inside it.
  const lastInHub = useRef<Partial<Record<HubId, Tab>>>({})
  const hub = hubOf(tab)
  if (hub) lastInHub.current[hub.id] = tab
  const openHub = useCallback(
    (target: Hub) => setTab(lastInHub.current[target.id] ?? target.tabs[0].id),
    [setTab],
  )

  const owned = Object.values(collection).filter((n) => n > 0).length

  const handleBuy = useCallback(
    (pack: Pack) => {
      const taken = pack.once
        ? claimWelcomePack()
        : pack.free
          ? claimFreePack()
          : buy(pack.price)
      if (!taken) return
      const cards = openPack(pack)
      // Snapshot ownership before adding, so NEW badges reflect the pre-pack state.
      const before = useGame.getState().collection
      const seen = new Set<string>()
      const pulls: Pull[] = cards.map((card) => {
        const isNew = !(before[card.id] ?? 0) && !seen.has(card.id)
        seen.add(card.id)
        return { card, isNew }
      })
      add(cards)
      setOpening({ pack, pulls })
    },
    [buy, add, claimFreePack, claimWelcomePack],
  )

  const screen =
    tab === 'store' ? (
      <PackStore balance={balance} freeReadyIn={freeReadyIn} welcomeClaimed={welcomeClaimed} onBuy={handleBuy} />
    ) : tab === 'market' ? (
      <Market onInspect={setInspecting} />
    ) : tab === 'race' ? (
      <Race />
    ) : tab === 'quiz' ? (
      <Quiz />
    ) : tab === 'clicker' ? (
      <Clicker />
    ) : tab === 'objectives' ? (
      <Objectives />
    ) : tab === 'catalog' ? (
      <Catalog collection={collection} onInspect={setInspecting} />
    ) : tab === 'settings' ? (
      <Settings onReset={() => setTab('store')} />
    ) : (
      <Garage
        collection={collection}
        packsOpened={packsOpened}
        onInspect={setInspecting}
        onSellDuplicates={sellDuplicates}
      />
    )

  return (
    <div className="app-bg min-h-full">
      <SideRail tab={tab} badges={badges} onNavigate={setTab} onNavigateHub={openHub} />

      <div className="lg:pl-60">
        <TopBar tab={tab} balance={balance} owned={owned} total={TOTAL_CARS} onNavigate={setTab} />

        <main
          className={`mx-auto w-full px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-10 lg:pb-14 lg:pt-8 ${WIDTH[tab]}`}
        >
          {hub && hub.tabs.length > 1 && (
            <SubTabs
              className="mb-6"
              value={tab}
              onChange={setTab}
              tabs={hub.tabs.map((t) => ({ ...t, badge: badges[t.id] }))}
            />
          )}
          {/* Keyed on the tab, so each screen mounts fresh and fades in. No
              exit phase: an AnimatePresence mode="wait" here held the old
              screen for its fade-out, and a second tap inside that window
              left the in-between screen mounted for good — the URL moved on
              but the page did not. Skipping the fade-out also makes every
              tap land 180ms sooner. */}
          <motion.div
            key={tab}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {screen}
          </motion.div>
        </main>
      </div>

      <BottomNav tab={tab} badges={badges} onNavigate={openHub} />

      {opening && (
        <PackOpening
          pack={opening.pack}
          pulls={opening.pulls}
          canAffordAnother={opening.pack.free ? false : balance >= opening.pack.price}
          onOpenAnother={(pack) => {
            setOpening(null)
            handleBuy(pack)
          }}
          onDone={() => setOpening(null)}
        />
      )}

      <CardDetail
        card={inspecting}
        owned={inspecting ? (collection[inspecting.id] ?? 0) : 0}
        onClose={() => setInspecting(null)}
        onSell={sellOne}
      />
    </div>
  )
}
