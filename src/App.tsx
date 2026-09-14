import { useCallback, useState } from 'react'
import { Balance } from './components/Balance'
import { CardDetail } from './components/CardDetail'
import { Catalog } from './components/Catalog'
import { Garage } from './components/Garage'
import { Market } from './components/Market'
import { Objectives } from './components/Objectives'
import { PackOpening } from './components/PackOpening'
import { PackStore } from './components/PackStore'
import { Quiz } from './components/Quiz'
import { Race } from './components/Race'
import { Settings } from './components/Settings'
import { FREE_PACK_COOLDOWN_MS } from './game/economy'
import { openPack } from './game/pack'
import { useGame } from './store/useGame'
import type { CardView, Pack, Pull } from './types'

type Tab = 'store' | 'market' | 'race' | 'quiz' | 'objectives' | 'garage' | 'catalog' | 'settings'

interface Opening {
  pack: Pack
  pulls: Pull[]
}

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

  const [tab, setTab] = useState<Tab>('store')
  const [opening, setOpening] = useState<Opening | null>(null)
  const [inspecting, setInspecting] = useState<CardView | null>(null)

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

  return (
    <div className="app-bg min-h-full">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#04060b]/85 backdrop-blur">
        {/* Eight tabs do not fit across a phone — they came to 633px against a
            360px screen and scrolled the whole page sideways. So the nav takes
            a row of its own below the title until there is room for it inline,
            and wraps within that row rather than running off the edge. */}
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <h1 className="order-1 shrink-0 text-lg font-black uppercase tracking-tight">
            Car<span className="text-gold-2">Cards</span>
          </h1>

          <div className="order-2 ml-auto shrink-0 xl:order-3">
            <Balance amount={balance} />
          </div>

          <nav className="order-3 flex w-full flex-wrap gap-1 xl:order-2 xl:ml-2 xl:w-auto">
            {(['store', 'market', 'race', 'quiz', 'objectives', 'catalog', 'garage', 'settings'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-lg px-2.5 py-1.5 text-[13px] font-bold capitalize transition sm:px-3 sm:text-sm ${
                  tab === t ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/80'
                }`}
              >
                {t === 'settings' ? '⚙️' : t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {tab === 'store' ? (
        <PackStore
          balance={balance}
          freeReadyIn={freeReadyIn}
          welcomeClaimed={welcomeClaimed}
          onBuy={handleBuy}
        />
      ) : tab === 'market' ? (
        <Market onInspect={setInspecting} />
      ) : tab === 'race' ? (
        <Race />
      ) : tab === 'quiz' ? (
        <Quiz />
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
      )}

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
