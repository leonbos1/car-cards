import { motion } from 'framer-motion'
import { CarFront, Settings } from 'lucide-react'
import { Balance } from '../Balance'
import { Badge } from '../ui/Badge'
import { HUBS, hubOf, type Hub, type Tab } from './nav'
import type { Badges } from './useBadges'

/** Two stacked, tilted cards and the name. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`headline inline-flex items-center gap-2.5 text-[26px] ${className}`}>
      <span aria-hidden className="relative inline-block h-7 w-6">
        <span className="absolute left-0 top-0.5 h-6 w-4 -rotate-12 rounded-[3px] border border-white/25 bg-white/10" />
        <span className="absolute left-2 top-0 h-6 w-4 rotate-6 rounded-[3px] bg-gradient-to-br from-[#ffe08a] to-[#b8871f] shadow-[0_0_14px_rgb(232_194_90/0.45)]" />
      </span>
      <span>
        Car<span className="text-gold-2">Cards</span>
      </span>
    </span>
  )
}

/** The strip across the top: the name on phones, and the player's numbers. */
export function TopBar({
  tab,
  balance,
  owned,
  total,
  onNavigate,
}: {
  tab: Tab
  balance: number
  owned: number
  total: number
  onNavigate: (tab: Tab) => void
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#070a11]/80 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-2 px-4 lg:h-16 lg:px-8">
        <button type="button" onClick={() => onNavigate('store')} className="lg:hidden" aria-label="Home">
          <Wordmark className="text-[22px]" />
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('garage')}
            className="hidden h-9 items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3.5 text-white/70 transition hover:text-white sm:flex"
            title="Your collection"
          >
            <CarFront size={17} strokeWidth={2.2} />
            <span className="num text-base leading-none">
              {owned}
              <span className="text-white/35">/{total}</span>
            </span>
          </button>
          <Balance amount={balance} />
          <button
            type="button"
            onClick={() => onNavigate(tab === 'settings' ? 'store' : 'settings')}
            aria-label="Settings"
            aria-pressed={tab === 'settings'}
            className={`grid size-9 place-items-center rounded-full border transition ${
              tab === 'settings'
                ? 'border-gold-2/60 bg-gold-2/15 text-gold-2'
                : 'border-white/10 bg-black/40 text-white/60 hover:text-white'
            }`}
          >
            <Settings size={18} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * The phone tab bar. Five destinations in thumb reach, with Race raised in the
 * middle: it is the one screen with no timer and no cap, so it is the one the
 * game is built around returning to.
 */
export function BottomNav({
  tab,
  badges,
  onNavigate,
}: {
  tab: Tab
  badges: Badges
  onNavigate: (hub: Hub) => void
}) {
  const current = hubOf(tab)?.id
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 lg:hidden" aria-label="Main">
      <div className="relative border-t border-white/10 bg-[#070a11]/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-2/45 to-transparent"
        />
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {HUBS.map((hub) => {
            const active = hub.id === current
            const Icon = hub.icon
            if (hub.id === 'race') {
              return (
                <button
                  key={hub.id}
                  type="button"
                  onClick={() => onNavigate(hub)}
                  aria-current={active ? 'page' : undefined}
                  className="relative flex flex-col items-center justify-end pb-2"
                >
                  <span
                    className={`absolute -top-6 grid size-[60px] place-items-center rounded-full border-2 transition ${
                      active
                        ? 'border-gold-3 bg-gradient-to-b from-[#ffe08a] to-[#c28f22] text-[#2a1c02] shadow-[0_0_28px_rgb(232_194_90/0.55)]'
                        : 'border-gold-2/70 bg-gradient-to-b from-asphalt-3 to-pitch text-gold-2 shadow-[0_0_18px_rgb(232_194_90/0.25)]'
                    }`}
                  >
                    <Icon size={26} strokeWidth={2.4} />
                    {(badges.race ?? 0) > 0 && (
                      <span className="absolute right-0.5 top-0.5 size-3 animate-pulse-soft rounded-full bg-signal shadow-[0_0_0_2px_var(--color-pitch)]" />
                    )}
                  </span>
                  <span
                    className={`font-display text-[11px] font-extrabold uppercase italic tracking-wider ${
                      active ? 'text-gold-2' : 'text-white/55'
                    }`}
                  >
                    {hub.label}
                  </span>
                </button>
              )
            }
            return (
              <button
                key={hub.id}
                type="button"
                onClick={() => onNavigate(hub)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-16 flex-col items-center justify-center gap-1 transition-colors ${
                  active ? 'text-gold-2' : 'text-white/45 active:text-white/80'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    className="absolute top-0 h-[3px] w-10 bg-gold-2 shadow-[0_0_14px_rgb(232_194_90/0.8)]"
                    style={{ clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <span className="relative">
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                  <Badge count={badges[hub.id]} className="absolute -right-3 -top-1.5" />
                </span>
                <span className="font-display text-[11px] font-bold uppercase tracking-wider">{hub.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

/** The desktop rail: the same five destinations, with each hub's screens under it. */
export function SideRail({
  tab,
  badges,
  onNavigate,
  onNavigateHub,
}: {
  tab: Tab
  badges: Badges
  onNavigate: (tab: Tab) => void
  onNavigateHub: (hub: Hub) => void
}) {
  const current = hubOf(tab)?.id
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/[0.07] bg-[#070a11]/95 backdrop-blur-xl lg:flex">
      <button type="button" onClick={() => onNavigate('store')} className="px-6 pb-7 pt-6 text-left">
        <Wordmark />
      </button>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Main">
        {HUBS.map((hub) => {
          const active = hub.id === current
          const Icon = hub.icon
          return (
            <div key={hub.id}>
              <button
                type="button"
                onClick={() => onNavigateHub(hub)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                  active
                    ? 'bg-gradient-to-r from-gold-2/[0.16] to-transparent text-white'
                    : 'text-white/50 hover:bg-white/[0.04] hover:text-white/85'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="rail-active"
                    className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-gold-2 shadow-[0_0_12px_rgb(232_194_90/0.8)]"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <Icon size={20} strokeWidth={2.3} className={active ? 'text-gold-2' : ''} />
                <span className="headline flex-1 text-[22px] leading-none">{hub.label}</span>
                {hub.id === 'race' && (badges.race ?? 0) > 0 ? (
                  <span className="tag bg-signal text-white">Live</span>
                ) : (
                  <Badge count={badges[hub.id]} />
                )}
              </button>
              {active && hub.tabs.length > 1 && (
                <div className="mb-2 ml-[2.1rem] mt-1 space-y-0.5 border-l border-white/10 pl-3">
                  {hub.tabs.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onNavigate(t.id)}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left font-display text-[15px] font-bold uppercase tracking-wide transition ${
                        t.id === tab ? 'text-gold-2' : 'text-white/45 hover:text-white/80'
                      }`}
                    >
                      {t.label}
                      <Badge count={badges[t.id]} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
      <div className="border-t border-white/[0.07] p-3">
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
            tab === 'settings' ? 'text-gold-2' : 'text-white/45 hover:bg-white/[0.04] hover:text-white/85'
          }`}
        >
          <Settings size={18} strokeWidth={2.2} />
          <span className="font-display text-base font-bold uppercase tracking-wide">Settings</span>
        </button>
      </div>
    </aside>
  )
}
