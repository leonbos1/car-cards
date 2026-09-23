import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  CarFront,
  Check,
  Factory,
  Gauge,
  Gem,
  Globe,
  Medal,
  Package,
  Target,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { formatEuros } from '../game/economy'
import { TOTAL_OBJECTIVE_REWARD, objectiveProgress } from '../game/objectives'
import { ownedCards, useGame } from '../store/useGame'
import { PageHeader } from './ui/PageHeader'

type Row = ReturnType<typeof objectiveProgress>[number]

/** Picks a glyph from the kind of goal, which the id encodes. Purely decorative. */
function iconFor(id: string): LucideIcon {
  if (id.startsWith('collect-')) return CarFront
  if (id.startsWith('make')) return Factory
  if (id.startsWith('countries-')) return Globe
  if (id.startsWith('packs-')) return Package
  if (id.startsWith('rated-')) return Gauge
  if (id.startsWith('first-')) return Gem
  if (id.endsWith('-complete')) return Medal
  return Target
}

export function Objectives() {
  const collection = useGame((s) => s.collection)
  const packsOpened = useGame((s) => s.packsOpened)
  const claimedObjectives = useGame((s) => s.claimedObjectives)
  const claimObjective = useGame((s) => s.claimObjective)
  const reduceMotion = useReducedMotion()

  const rows = objectiveProgress(
    { owned: ownedCards(collection), packsOpened },
    claimedObjectives,
  )

  const claimable = rows.filter((r) => r.complete && !r.claimed)
  const collected = rows
    .filter((r) => r.claimed)
    .reduce((sum, r) => sum + r.objective.reward, 0)

  // Unclaimed rewards first — they are money sitting on the table. The view
  // groups by the same rank: ready, then in progress, then already collected.
  const inProgress = rows.filter((r) => !r.complete && !r.claimed)
  const claimed = rows.filter((r) => r.claimed)
  const readyTotal = claimable.reduce((sum, r) => sum + r.objective.reward, 0)
  const available = TOTAL_OBJECTIVE_REWARD - collected
  const collectedPct = TOTAL_OBJECTIVE_REWARD > 0 ? (collected / TOTAL_OBJECTIVE_REWARD) * 100 : 0

  return (
    <div>
      <PageHeader
        eyebrow="Missions"
        title="Objectives"
        subtitle={
          <>
            Packs always cost more than their cars sell for, so this is where the money comes from.
            {claimable.length > 0 && (
              <span className="ml-1 font-semibold text-gold-2">
                {claimable.length} ready to collect.
              </span>
            )}
          </>
        }
        right={
          <div className="text-right">
            <div className="eyebrow">Completed</div>
            <div className="num text-2xl leading-none">
              {claimed.length}
              <span className="text-white/35">/{rows.length}</span>
            </div>
          </div>
        }
      />

      {/* Prize fund: what has been banked and what is still out there. */}
      <section className="panel-cut relative mb-8 overflow-hidden p-4 sm:p-6" aria-label="Prize fund">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-gold-2/[0.12] blur-3xl"
        />
        <div className="relative grid grid-cols-2 gap-3 sm:gap-8">
          <div className="min-w-0">
            <div className="eyebrow">Collected</div>
            <div className="num mt-1 whitespace-nowrap text-[26px] leading-none text-gold-2 [text-shadow:0_0_24px_rgb(232_194_90/0.35)] sm:text-5xl">
              {formatEuros(collected)}
            </div>
          </div>
          <div className="min-w-0 border-l border-white/10 pl-3 sm:pl-8">
            <div className="eyebrow">Still available</div>
            <div className="num mt-1 whitespace-nowrap text-[26px] leading-none sm:text-5xl">
              {formatEuros(available)}
            </div>
          </div>
        </div>

        <div className="relative mt-5">
          <div className="h-2 overflow-hidden bg-white/[0.07]" style={{ clipPath: SLANT }}>
            <motion.div
              className="h-full bg-gradient-to-r from-gold-1 via-gold-2 to-gold-3 shadow-[0_0_12px_rgb(232_194_90/0.6)]"
              initial={false}
              animate={{ width: `${collectedPct}%` }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-white/40">
            <span className="num">{Math.floor(collectedPct)}% of the prize fund</span>
            <span className="num">{formatEuros(TOTAL_OBJECTIVE_REWARD)}</span>
          </div>
        </div>

        {claimable.length > 0 && (
          <div className="relative mt-5 flex items-center gap-3 border border-gold-2/40 bg-gold-2/[0.1] px-3.5 py-2.5">
            <Trophy size={20} strokeWidth={2.4} className="shrink-0 animate-pulse-soft text-gold-2" />
            <p className="min-w-0 text-sm text-white/75">
              <span className="num text-lg text-gold-2">{formatEuros(readyTotal)}</span> waiting in{' '}
              <span className="num text-white">{claimable.length}</span> finished{' '}
              {claimable.length === 1 ? 'objective' : 'objectives'}
            </p>
          </div>
        )}
      </section>

      {claimable.length > 0 && (
        <Group title="Ready to collect" count={claimable.length} tone="gold">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence initial={false}>
              {claimable.map((row) => (
                <ClaimableRow
                  key={row.objective.id}
                  row={row}
                  reduceMotion={!!reduceMotion}
                  onClaim={() => claimObjective(row.objective.id)}
                />
              ))}
            </AnimatePresence>
          </ul>
        </Group>
      )}

      {inProgress.length > 0 && (
        <Group title="In progress" count={inProgress.length}>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {inProgress.map((row) => (
              <ProgressRow key={row.objective.id} row={row} reduceMotion={!!reduceMotion} />
            ))}
          </ul>
        </Group>
      )}

      {claimed.length > 0 && (
        <Group title="Collected" count={claimed.length}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {claimed.map(({ objective }) => (
              <li
                key={objective.id}
                className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-white/40"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-go/15 text-go/80">
                  <Check size={14} strokeWidth={3} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white/55">{objective.name}</div>
                  <div className="truncate text-xs">{objective.detail}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="eyebrow text-white/30">Collected</div>
                  <div className="num text-sm">{formatEuros(objective.reward)}</div>
                </div>
              </li>
            ))}
          </ul>
        </Group>
      )}
    </div>
  )
}

const SLANT = 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)'

function Group({
  title,
  count,
  tone,
  children,
}: {
  title: string
  count: number
  tone?: 'gold'
  children: ReactNode
}) {
  return (
    <section className="mb-8">
      <h3 className="mb-3 flex items-center gap-2.5">
        <span className={`headline text-xl ${tone === 'gold' ? 'text-gold-2' : 'text-white/80'}`}>{title}</span>
        <span className={`tag ${tone === 'gold' ? '' : '!bg-white/10 !text-white/60'}`}>{count}</span>
        <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
      </h3>
      {children}
    </section>
  )
}

function ClaimableRow({ row, onClaim, reduceMotion }: { row: Row; onClaim: () => void; reduceMotion: boolean }) {
  const { objective } = row
  const Icon = iconFor(objective.id)
  return (
    <motion.li
      layout={!reduceMotion}
      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className="relative overflow-hidden rounded-xl border border-gold-2/55 bg-gradient-to-br from-gold-2/[0.16] via-asphalt-2 to-asphalt p-3.5 shadow-[0_0_24px_-6px_rgb(232_194_90/0.45),inset_0_1px_0_rgb(255_242_196/0.15)]">
      {/* A slow glint across the card, so finished goals catch the eye. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-sheen bg-gradient-to-r from-transparent via-gold-3/[0.12] to-transparent"
      />
      <div className="relative flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-gradient-to-b from-[#ffe08a] to-[#b8871f] text-[#2a1c02] shadow-[0_0_16px_rgb(232_194_90/0.45),inset_0_1px_0_rgb(255_255_255/0.6)]">
          <Icon size={22} strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg font-bold uppercase italic leading-tight">
            {objective.name}
          </div>
          <div className="truncate text-xs text-white/55">{objective.detail}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onClaim}
        className="btn btn-primary relative mt-3 w-full"
      >
        <Trophy size={17} strokeWidth={2.6} />
        Collect <span className="num">{formatEuros(objective.reward)}</span>
      </button>
    </motion.li>
  )
}

function ProgressRow({ row, reduceMotion }: { row: Row; reduceMotion: boolean }) {
  const { objective, current } = row
  const Icon = iconFor(objective.id)
  const pct = Math.round((current / objective.target) * 100)
  return (
    <li className="panel flex flex-col gap-2.5 p-3">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white/55">
          <Icon size={18} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{objective.name}</div>
          <div className="truncate text-xs text-white/50">{objective.detail}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="eyebrow">Reward</div>
          <div className="num text-base leading-tight text-gold-2/85">{formatEuros(objective.reward)}</div>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <div
          className="h-1.5 flex-1 overflow-hidden bg-white/[0.08]"
          style={{ clipPath: SLANT }}
          role="progressbar"
          aria-label={`${objective.name} progress`}
          aria-valuemin={0}
          aria-valuemax={objective.target}
          aria-valuenow={current}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-gold-1 to-gold-2"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={reduceMotion ? { duration: 0 } : undefined}
          />
        </div>
        <span className="num shrink-0 text-xs text-white/60">
          {current}
          <span className="text-white/35"> / {objective.target}</span>
        </span>
      </div>
    </li>
  )
}
