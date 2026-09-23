import { useEffect, useMemo, useState } from 'react'
import { QUIZ_CATEGORIES } from '../../data/quiz'
import { objectiveProgress } from '../../game/objectives'
import { ownedCards, useGame } from '../../store/useGame'
import { HUBS, type HubId, type Tab } from './nav'

/** A clock that ticks every `ms`, so cooldowns turn into badges without a tap. */
function useNow(ms: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(id)
  }, [ms])
  return now
}

export type Badges = Partial<Record<Tab | HubId, number>>

/**
 * Something waiting for you, per screen: a free pack to open, an objective to
 * collect, a quiz off cooldown, a season mid-way. A game tells you where the
 * reward is; before this, finding a claimable objective meant opening the tab
 * on the off chance.
 */
export function useBadges(): Badges {
  const now = useNow(30_000)
  const collection = useGame((s) => s.collection)
  const packsOpened = useGame((s) => s.packsOpened)
  const claimedObjectives = useGame((s) => s.claimedObjectives)
  const welcomeClaimed = useGame((s) => s.welcomeClaimed)
  const freePackReadyIn = useGame((s) => s.freePackReadyIn)
  const quizReadyIn = useGame((s) => s.quizReadyIn)
  const season = useGame((s) => s.season)
  // Subscribed so the badges recompute when a free pack or quiz is used.
  useGame((s) => s.lastFreePackAt)
  useGame((s) => s.quizPlayedAt)

  const claimable = useMemo(
    () =>
      objectiveProgress({ owned: ownedCards(collection), packsOpened }, claimedObjectives).filter(
        (p) => p.complete && !p.claimed,
      ).length,
    [collection, packsOpened, claimedObjectives],
  )

  const badges: Badges = {
    store: (welcomeClaimed ? 0 : 1) + (freePackReadyIn(now) === 0 ? 1 : 0),
    objectives: claimable,
    quiz: QUIZ_CATEGORIES.filter((c) => quizReadyIn(c.id, now) === 0).length,
    race: season ? 1 : 0,
  }
  for (const hub of HUBS) {
    badges[hub.id] = hub.tabs.reduce((sum, t) => sum + (badges[t.id] ?? 0), 0)
  }
  return badges
}
