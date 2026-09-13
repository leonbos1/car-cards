import { useCallback, useState } from 'react'
import { Balance } from './components/Balance'
import { CardDetail } from './components/CardDetail'
import { Catalog } from './components/Catalog'
import { Garage } from './components/Garage'
import { Objectives } from './components/Objectives'
import { PackOpening } from './components/PackOpening'
import { PackStore } from './components/PackStore'
import { Settings } from './components/Settings'
import { FREE_PACK_COOLDOWN_MS } from './game/economy'
import { openPack } from './game/pack'
import { useGame } from './store/useGame'
import type { CardView, Pack, Pull } from './types'

type Tab = 'store' | 'objectives' | 'garage' | 'catalog' | 'settings'

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
      if (pack.free ? !claimFreePack() : !buy(pack.price)) return
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
    [buy, add, claimFreePack],
  )

  return (
    <div className="app-bg min-h-full">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#04060b]/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <h1 className="text-lg font-black uppercase tracking-tight">
            Car<span className="text-gold-2">Cards</span>
          </h1>

          <nav className="ml-2 flex gap-1">
            {(['store', 'objectives', 'catalog', 'garage', 'settings'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold capitalize transition ${
                  tab === t ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/80'
                }`}
              >
                {t === 'settings' ? '⚙️' : t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </nav>

          <div className="ml-auto shrink-0">
            <Balance amount={balance} />
          </div>
        </div>
      </header>

      {tab === 'store' ? (
        <PackStore
          balance={balance}
          freeReadyIn={freeReadyIn}
          onBuy={handleBuy}
        />
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
          canAffordAnother={
            opening.pack.free ? false : balance >= opening.pack.price
          }
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
