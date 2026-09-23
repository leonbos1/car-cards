import {
  ArrowLeftRight,
  BookOpen,
  BrainCircuit,
  Flag,
  Layers,
  MousePointerClick,
  Target,
  Trophy,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

export type Tab =
  | 'store'
  | 'market'
  | 'race'
  | 'quiz'
  | 'objectives'
  | 'garage'
  | 'catalog'
  | 'clicker'
  | 'settings'

export type HubId = 'packs' | 'market' | 'race' | 'garage' | 'earn'

export interface NavItem {
  id: Tab
  label: string
  icon: LucideIcon
}

export interface Hub {
  id: HubId
  label: string
  icon: LucideIcon
  /** The screens inside the hub; more than one gets a sub-tab strip. */
  tabs: NavItem[]
}

/**
 * Nine screens grouped into five destinations — the most a thumb-reach tab bar
 * holds. Grouped by what the player is doing, not by how the code is split:
 * the garage and the catalog are both "look at cars", and the objectives, quiz
 * and clicker are all "earn money on the side". Settings is not a destination
 * at all; it lives behind the gear.
 */
export const HUBS: Hub[] = [
  { id: 'packs', label: 'Packs', icon: Layers, tabs: [{ id: 'store', label: 'Packs', icon: Layers }] },
  {
    id: 'market',
    label: 'Market',
    icon: ArrowLeftRight,
    tabs: [{ id: 'market', label: 'Market', icon: ArrowLeftRight }],
  },
  { id: 'race', label: 'Race', icon: Flag, tabs: [{ id: 'race', label: 'Race', icon: Flag }] },
  {
    id: 'garage',
    label: 'Garage',
    icon: Warehouse,
    tabs: [
      { id: 'garage', label: 'My cars', icon: Warehouse },
      { id: 'catalog', label: 'Catalog', icon: BookOpen },
    ],
  },
  {
    id: 'earn',
    label: 'Earn',
    icon: Trophy,
    tabs: [
      { id: 'objectives', label: 'Objectives', icon: Target },
      { id: 'quiz', label: 'Quiz', icon: BrainCircuit },
      { id: 'clicker', label: 'Clicker', icon: MousePointerClick },
    ],
  },
]

export function hubOf(tab: Tab): Hub | undefined {
  return HUBS.find((h) => h.tabs.some((t) => t.id === tab))
}

const TABS: readonly Tab[] = [...HUBS.flatMap((h) => h.tabs.map((t) => t.id)), 'settings']

function tabFromHash(): Tab {
  const id = window.location.hash.replace(/^#\/?/, '')
  return (TABS as readonly string[]).includes(id) ? (id as Tab) : 'store'
}

/**
 * The current screen, kept in the URL hash.
 *
 * Before this, the screen was plain component state: a refresh dropped you back
 * on the store, and on Android the hardware back button closed the app instead
 * of going back a screen. With every change pushed as a history entry, back
 * steps through the screens you visited and a reload stays where you were.
 */
export function useHashTab(): [Tab, (tab: Tab) => void] {
  const [tab, setTab] = useState<Tab>(tabFromHash)

  useEffect(() => {
    const sync = () => setTab(tabFromHash())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const go = useCallback((next: Tab) => {
    if (next !== tabFromHash()) window.location.hash = `/${next}`
    // Leaving a long list for another screen should not land you halfway down it.
    window.scrollTo({ top: 0 })
  }, [])

  return [tab, go]
}
