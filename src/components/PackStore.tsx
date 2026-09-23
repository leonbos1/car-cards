import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, Gift, Timer } from 'lucide-react'
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  LADDER,
  MARQUE_PACKS,
  MARQUE_PACK_PRICE,
  MARQUE_PACK_SIZE,
  MARQUE_PACK_SLOTS,
  contentsLine,
  tierBreakdown,
} from '../data/packs'
import { FREE_PACK_COOLDOWN_MS, formatCountdown, formatEuros } from '../game/economy'
import { ALL_CARDS } from '../game/pack'
import { useGame } from '../store/useGame'
import type { Pack } from '../types'
import { BrandBadge } from './BrandBadge'
import { CLASS_COLORS } from './CarCard'
import { PageHeader } from './ui/PageHeader'

interface Props {
  balance: number
  /** Milliseconds until the free pack returns; 0 when it is ready. */
  freeReadyIn: number
  /** The one-off welcome pack disappears once taken. */
  welcomeClaimed: boolean
  onBuy: (pack: Pack) => void
}

export function PackStore({ balance, freeReadyIn, welcomeClaimed, onBuy }: Props) {
  // The countdown has to move on its own, so tick while a pack is on cooldown.
  const [, setNow] = useState(0)
  useEffect(() => {
    if (freeReadyIn <= 0) return
    const id = setInterval(() => setNow((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [freeReadyIn])

  const packs = LADDER.filter((pack) => !(pack.once && welcomeClaimed))
  // The free packs lead the screen on their own row: they are what a player
  // should be drawn to first, and they are not rungs on the price ladder.
  const free = packs.filter((pack) => pack.free)
  const paid = packs.filter((pack) => !pack.free)

  const tile = (pack: Pack, featured: boolean) => (
    <PackTile
      key={pack.id}
      pack={pack}
      featured={featured}
      locked={pack.once ? false : pack.free ? freeReadyIn > 0 : balance < pack.price}
      readyIn={pack.free && !pack.once ? freeReadyIn : 0}
      waitLabel={pack.free && !pack.once && freeReadyIn > 0 ? formatCountdown(freeReadyIn) : null}
      onBuy={onBuy}
    />
  )

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Pack store"
        title="Store"
        subtitle="Every pack lists what it deals and the rating it caps out at. Packs cost more than their cars are worth — they are how you find cars, not how you make money."
      />

      {free.length > 0 && (
        <div className={`mb-8 grid gap-4 ${free.length > 1 ? 'lg:grid-cols-2' : ''}`}>
          {free.map((pack) => tile(pack, true))}
        </div>
      )}

      <SectionHeading eyebrow="The ladder">Packs</SectionHeading>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{paid.map((pack) => tile(pack, false))}</div>

      <MarquePacks balance={balance} onBuy={onBuy} />
    </div>
  )
}

/* ------------------------------------------------------------------ art -- */

/** What a pack's foil is printed in: its tier, with a darker cut for premium. */
function foilPalette(pack: Pack) {
  const [deep, mid, light] = CLASS_COLORS[pack.art]
  if (pack.art === 'special') {
    return { deep, mid, light, ink: '#ffe6a3', glow: mid, band: 'rgb(0 0 0 / 0.35)', tag: mid }
  }
  // Premium Gold is the one gold pack with a headline guarantee; print it on
  // black foil with gold ink so it does not read as a dearer copy of Gold.
  if (pack.art === 'gold' && pack.headlinerMinOverall !== undefined && !pack.make) {
    return { deep: '#050403', mid: '#2a2010', light: '#6b5220', ink: '#ffd873', glow: mid, band: 'rgb(232 194 90 / 0.14)', tag: 'var(--color-gold-2)' }
  }
  // Ink a shade under the tier's own deep tone, so the name holds on the
  // pale end of the gradient as well as the dark end.
  const ink = { bronze: '#3d230f', silver: '#1e2429', gold: '#3f2e06' }[pack.art]
  return { deep, mid, light, ink, glow: mid, band: 'rgb(0 0 0 / 0.14)', tag: mid }
}

/** Crimped top and bottom edges, like the seal on a foil pack. */
function crimp(teeth: number, depth: number): string {
  const top: string[] = []
  const bottom: string[] = []
  for (let i = 0; i <= teeth * 2; i++) {
    const x = `${((i / (teeth * 2)) * 100).toFixed(2)}%`
    top.push(`${x} ${i % 2 ? `${depth}px` : '0'}`)
    bottom.unshift(`${x} ${i % 2 ? `calc(100% - ${depth}px)` : '100%'}`)
  }
  return `polygon(${[...top, ...bottom].join(', ')})`
}

/**
 * The pack itself, drawn as a foil packet: tier-coloured, crimp-sealed, with
 * the name across a band. The store tiles and the opening screen draw the
 * same packet, so the thing you tap to buy is the thing you tear open.
 */
export function PackFoil({
  pack,
  width,
  height,
  shine = false,
  dim = false,
  className = '',
  style,
}: {
  pack: Pack
  width: number
  height: number
  /** Run the sheen across the foil — for a pack that is ready to open. */
  shine?: boolean
  dim?: boolean
  className?: string
  style?: CSSProperties
}) {
  const p = foilPalette(pack)
  const short = pack.name.replace(/ Pack$/, '')
  const depth = Math.max(3, Math.round(height * 0.018))
  return (
    <div
      aria-hidden
      className={`relative shrink-0 overflow-hidden ${dim ? 'grayscale-[0.8] brightness-[0.6]' : ''} ${className}`}
      style={{
        width,
        height,
        clipPath: crimp(Math.round(width / 9), depth),
        background: `linear-gradient(155deg, ${p.light} 0%, ${p.mid} 42%, ${p.deep} 100%)`,
        ...style,
      }}
    >
      {/* livery stripes */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            'repeating-linear-gradient(115deg, rgba(255,255,255,.13) 0 10%, transparent 10% 24%)',
        }}
      />
      {/* gloss */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(120deg, rgba(255,255,255,.4) 0%, rgba(255,255,255,0) 32%, rgba(0,0,0,0) 62%, rgba(0,0,0,.3) 100%)',
        }}
      />
      {/* crimp shading */}
      <div className="absolute inset-x-0 top-0 bg-black/20" style={{ height: depth * 3 }} />
      <div className="absolute inset-x-0 bottom-0 bg-black/25" style={{ height: depth * 3 }} />

      <div
        className="absolute inset-0 flex flex-col items-center justify-between text-center"
        style={{ padding: `${height * 0.08}px ${width * 0.08}px`, color: p.ink }}
      >
        <span
          className="font-display font-extrabold uppercase italic"
          style={{ fontSize: Math.max(8, width * 0.075), letterSpacing: '0.18em', opacity: 0.75 }}
        >
          Car Cards
        </span>
        <span
          className="flex w-[calc(100%+20%)] flex-col items-center py-[6%]"
          style={{ background: p.band, transform: 'skewY(-8deg)' }}
        >
          <span
            className="headline block"
            style={{ fontSize: width * (short.length > 8 ? 0.15 : 0.2), transform: 'skewY(8deg)' }}
          >
            {short}
          </span>
        </span>
        <span className="num" style={{ fontSize: Math.max(9, width * 0.085), opacity: 0.8 }}>
          {pack.tiers.length} CARS
        </span>
      </div>

      {shine && (
        <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-sheen bg-gradient-to-r from-transparent via-white/55 to-transparent" />
      )}
    </div>
  )
}

/** A section title inside the screen, a step below the page header. */
function SectionHeading({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <p className="eyebrow mb-1">{eyebrow}</p>
      <h3 className="headline flex items-center gap-2 text-2xl sm:text-3xl">
        <span
          aria-hidden
          className="inline-block h-[0.7em] w-1.5 bg-gold-2"
          style={{ clipPath: 'polygon(40% 0, 100% 0, 60% 100%, 0 100%)' }}
        />
        {children}
      </h3>
    </div>
  )
}

/** A row of slots, one per card, coloured by tier — the contents at a glance. */
function SlotBar({ pack }: { pack: Pack }) {
  const slots = tierBreakdown(pack).flatMap(({ tier, count }) => Array(count).fill(tier) as string[])
  return (
    <div aria-hidden className="flex gap-[3px]">
      {slots.map((tier, i) => (
        <span
          key={i}
          className="h-1.5 min-w-0 flex-1"
          style={{
            background: CLASS_COLORS[tier as Pack['art']][1],
            clipPath: 'polygon(2px 0, 100% 0, calc(100% - 2px) 100%, 0 100%)',
          }}
        />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------- marques -- */

/**
 * One pack per marque, all at the same price.
 *
 * Shown apart from the ladder and as a list rather than as twenty more tiles:
 * these are not steps up from each other, they are the same pack aimed at
 * different brands, and the thing a player is choosing between is which brand
 * they want — so the badge, the marque and how much of it you already hold are
 * what each row leads with.
 */
function MarquePacks({ balance, onBuy }: { balance: number; onBuy: (p: Pack) => void }) {
  const collection = useGame((s) => s.collection)
  // Every marque pack is built from one template, so any of them describes all.
  const spec = MARQUE_PACKS[0]

  const rows = useMemo(
    () =>
      MARQUE_PACKS.map((pack) => {
        const cars = ALL_CARDS.filter((c) => c.make === pack.make)
        return {
          pack,
          total: cars.length,
          owned: cars.filter((c) => (collection[c.id] ?? 0) > 0).length,
          // What this pack can actually reach, which is not the marque's best
          // car when its best car sits above the cap.
          reach: Math.max(
            ...cars
              .filter((c) => !c.special && c.overall <= (pack.maxOverall ?? 99))
              .map((c) => c.overall),
          ),
        }
      }),
    [collection],
  )

  return (
    <section className="mt-12">
      <SectionHeading eyebrow="Pick a brand">Marque packs</SectionHeading>
      {/* Read off a real pack, so what is advertised here cannot drift from
          what the packs deal — the same rule the odds panel above follows. */}
      <div className="panel mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5">
        <div className="flex shrink-0 items-center gap-3">
          <span className="num text-3xl leading-none text-gold-2">{formatEuros(MARQUE_PACK_PRICE)}</span>
          <span className="eyebrow leading-tight">
            each
            <br />
            {MARQUE_PACK_SIZE} gold cars
          </span>
        </div>
        <div className="min-w-0 border-white/10 sm:border-l sm:pl-5">
          <p className="text-sm text-white/70">
            {formatEuros(MARQUE_PACK_PRICE)} each. {MARQUE_PACK_SIZE} gold cars, at least{' '}
            {MARQUE_PACK_SLOTS} of them from the marque. {spec.guaranteedRare} guaranteed rare, then{' '}
            {(spec.rareChance * 100).toFixed(0)}% on the rest, one card rated{' '}
            {spec.headlinerMinOverall}+, nothing above {spec.maxOverall}, and no specials.
          </p>
          <p className="mt-1 text-xs text-white/40">
            The supercar marques have no pack — too few of their cars sit under the rating cap. Those
            you buy on the market, one at a time.
          </p>
        </div>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ pack, owned, total, reach }) => {
          const afford = balance >= pack.price
          return (
            <li key={pack.id}>
              <button
                type="button"
                disabled={!afford}
                onClick={() => onBuy(pack)}
                aria-label={`${pack.name}, ${formatEuros(pack.price)}${afford ? '' : ', not enough money'}`}
                className={`panel group flex w-full items-center gap-3 p-3 text-left ${
                  afford ? 'panel-interactive' : 'cursor-not-allowed opacity-50'
                }`}
              >
                <BrandBadge make={pack.make!} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-lg font-extrabold uppercase italic leading-tight">
                    {pack.make}
                  </span>
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full bg-gold-2/80"
                      style={{ width: `${total ? (owned / total) * 100 : 0}%` }}
                    />
                  </span>
                  <span className="mt-1 block text-xs text-white/45">
                    <span className="num text-white/75">
                      {owned} of {total}
                    </span>{' '}
                    collected · best <span className="num text-white/75">{reach}</span>
                  </span>
                </span>
                <span className={`btn btn-sm num shrink-0 ${afford ? 'btn-primary' : 'btn-secondary text-white/45'}`}>
                  {formatEuros(pack.price)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* ---------------------------------------------------------------- tiles -- */

function tierLabel(pack: Pack): string {
  if (pack.once) return 'Once only'
  if (pack.free) return 'Free'
  if (pack.headlinerMinOverall !== undefined) return 'Premium'
  return pack.art[0].toUpperCase() + pack.art.slice(1)
}

function PackTile({
  pack,
  featured,
  locked,
  readyIn,
  waitLabel,
  onBuy,
}: {
  pack: Pack
  /** The free packs get the big horizontal tile at the top of the store. */
  featured: boolean
  locked: boolean
  /** Cooldown left on a free pack, for the progress bar; 0 otherwise. */
  readyIn: number
  waitLabel: string | null
  onBuy: (p: Pack) => void
}) {
  const reduced = useReducedMotion() ?? false
  const [showOdds, setShowOdds] = useState(false)
  const p = foilPalette(pack)
  const ready = !locked
  const cooling = waitLabel !== null

  const buttonLabel = pack.once
    ? 'Open your welcome pack'
    : pack.free
    ? waitLabel
      ? `Back in ${waitLabel}`
      : 'Open free pack'
    : locked
      ? `Need ${formatEuros(pack.price)}`
      : formatEuros(pack.price)

  const cap = pack.maxOverall

  const odds = (
    <>
      <button
        type="button"
        onClick={() => setShowOdds((s) => !s)}
        aria-expanded={showOdds}
        className="eyebrow -my-2 inline-flex min-h-11 items-center gap-1 self-start pr-3 transition-colors hover:text-white/75"
      >
        {showOdds ? 'Hide odds' : 'View odds'}
        <ChevronDown size={13} strokeWidth={3} className={`transition-transform ${showOdds ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {showOdds && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="mt-2 space-y-1.5 overflow-hidden rounded-lg border border-white/[0.06] bg-black/35 p-3 text-xs"
          >
            {/* Read straight off the pack's slots, so this cannot drift. */}
            {tierBreakdown(pack).map(({ tier, count }) => (
              <Row
                key={tier}
                label={`${tier[0].toUpperCase()}${tier.slice(1)}`}
                swatch={CLASS_COLORS[tier][1]}
              >
                {count} of {pack.tiers.length}
              </Row>
            ))}
            <Row label="Rare">
              {pack.allRare
                ? 'every card'
                : pack.guaranteedRare > 0
                  ? `${pack.guaranteedRare} guaranteed, then ${(pack.rareChance * 100).toFixed(0)}%`
                  : `${(pack.rareChance * 100).toFixed(0)}%`}
            </Row>
            {pack.minOverall !== undefined && <Row label="Rating floor">{pack.minOverall}+</Row>}
            {pack.maxOverall !== undefined && <Row label="Rating cap">{pack.maxOverall}</Row>}
            {pack.headlinerMinOverall !== undefined && (
              <Row label="Best card">{pack.headlinerMinOverall}+ guaranteed</Row>
            )}
            <Row label="Special">
              {pack.specialChance > 0 ? `${(pack.specialChance * 100).toFixed(1)}%` : 'never'}
            </Row>
          </motion.ul>
        )}
      </AnimatePresence>
    </>
  )

  const contents = (
    <div className="space-y-1.5">
      <SlotBar pack={pack} />
      <p className="text-sm font-semibold text-white/80">{contentsLine(pack)}</p>
    </div>
  )

  /* ---- featured: the free packs ---- */
  if (featured) {
    const progress = cooling ? 1 - readyIn / FREE_PACK_COOLDOWN_MS : 1
    return (
      <motion.div
        layout={!reduced}
        className="min-w-0"
        style={ready ? { filter: 'drop-shadow(0 0 22px rgb(232 194 90 / 0.22))' } : undefined}
      >
        <article className="panel-cut relative overflow-hidden">
          {/* tier floodlight behind the pack */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 55% 90% at 16% 55%, ${p.glow}${ready ? '55' : '22'} 0%, transparent 70%)`,
            }}
          />
          <div
            aria-hidden
            className={`absolute inset-x-0 top-0 h-[2px] ${
              ready ? 'bg-gradient-to-r from-gold-2 via-gold-3 to-transparent' : 'bg-white/10'
            }`}
          />

          <div className="relative flex gap-4 p-4 sm:gap-6 sm:p-5">
            <motion.div
              className="shrink-0 self-center"
              animate={ready && !reduced ? { y: [0, -5, 0], rotate: [-4, -2, -4] } : { rotate: -4 }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ filter: `drop-shadow(0 14px 18px rgb(0 0 0 / 0.55)) drop-shadow(0 0 18px ${p.glow}66)` }}
            >
              <PackFoil pack={pack} width={104} height={146} shine={ready} dim={!ready} className="sm:hidden" />
              <PackFoil pack={pack} width={128} height={180} shine={ready} dim={!ready} className="hidden sm:block" />
            </motion.div>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex flex-wrap items-center gap-2">
                {ready ? (
                  <span className="tag gap-1.5">
                    <span className="size-1.5 animate-pulse-soft rounded-full bg-[#1a1204]" />
                    {pack.once ? 'Once only' : 'Ready'}
                  </span>
                ) : (
                  <span className="tag bg-white/15 text-white/70">Recharging</span>
                )}
                <span className="eyebrow">{pack.once ? 'Welcome gift' : 'Free every 8h'}</span>
              </div>
              <h3 className="headline mt-2 text-3xl sm:text-4xl">{pack.name}</h3>
              <p className="mt-1 text-sm leading-snug text-white/55">{pack.blurb}</p>
              <div className="mt-3 hidden sm:block">{contents}</div>
              <div className="mt-2 hidden sm:block">{odds}</div>
            </div>
          </div>

          <div className="relative space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
            <div className="sm:hidden">{contents}</div>
            <div className="sm:hidden">{odds}</div>

            {cooling ? (
              <button
                type="button"
                disabled
                aria-label={buttonLabel}
                onClick={() => onBuy(pack)}
                className="relative flex w-full cursor-not-allowed items-center gap-3 overflow-hidden rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-left"
              >
                <Timer size={20} className="shrink-0 text-gold-2" />
                <span className="eyebrow">Back in</span>
                <span className="num ml-auto text-2xl leading-none text-white">
                  {waitLabel}
                </span>
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-[3px] bg-white/[0.06]"
                >
                  <span
                    className="block h-full bg-gradient-to-r from-gold-1 to-gold-2"
                    style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
                  />
                </span>
              </button>
            ) : (
              <button
                type="button"
                disabled={locked}
                onClick={() => onBuy(pack)}
                className="btn btn-primary btn-lg w-full overflow-hidden"
              >
                <Gift size={20} strokeWidth={2.6} />
                {buttonLabel}
                {ready && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-sheen bg-gradient-to-r from-transparent via-white/60 to-transparent"
                  />
                )}
              </button>
            )}
          </div>
        </article>
      </motion.div>
    )
  }

  /* ---- the ladder ---- */
  return (
    <motion.article
      layout={!reduced}
      className="panel group relative flex min-w-0 overflow-hidden sm:flex-col"
      whileHover={locked || reduced ? undefined : { y: -3 }}
    >
      {/* the pack on its plinth */}
      <div
        className="relative flex w-[124px] shrink-0 items-center justify-center overflow-hidden border-r border-white/[0.06] sm:h-48 sm:w-auto sm:border-b sm:border-r-0"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 62%, ${p.glow}${locked ? '1f' : '4d'} 0%, transparent 72%), linear-gradient(180deg, var(--color-asphalt-3), var(--color-pitch))`,
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-50"
          style={{
            background:
              'repeating-linear-gradient(-55deg, transparent 0 14px, rgba(255,255,255,.025) 14px 15px)',
          }}
        />
        <PackFoil
          pack={pack}
          width={96}
          height={134}
          dim={locked}
          className="transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-0"
          style={{
            transform: 'rotate(-5deg)',
            filter: `drop-shadow(0 12px 14px rgb(0 0 0 / 0.6))`,
          }}
        />
        <span
          className="tag absolute left-2 top-2"
          style={{ background: p.tag }}
        >
          {tierLabel(pack)}
        </span>
        {cap !== undefined && (
          <span className="absolute bottom-2 right-2 hidden text-right leading-none sm:block">
            <span className="eyebrow block">Max</span>
            <span className="num text-lg text-white/85">{cap}</span>
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-3.5 sm:p-4">
        <h3 className="headline text-[26px] sm:text-[28px]">{pack.name}</h3>
        {contents}
        <p className="text-sm leading-snug text-white/50">{pack.blurb}</p>
        <div>{odds}</div>
        <div className="mt-auto pt-1">
          <button
            type="button"
            disabled={locked}
            onClick={() => onBuy(pack)}
            className={`btn w-full ${locked ? 'btn-secondary' : 'btn-primary'}`}
          >
            <span className="num text-[1.05rem]">{buttonLabel}</span>
          </button>
        </div>
      </div>
    </motion.article>
  )
}

function Row({ label, swatch, children }: { label: string; swatch?: string; children: ReactNode }) {
  return (
    <li className="flex justify-between gap-3 text-white/55">
      <span className="flex items-center gap-1.5">
        {swatch && <span className="size-2 rotate-45" style={{ background: swatch }} />}
        {label}
      </span>
      <span className="num text-[0.8rem] text-white/90">{children}</span>
    </li>
  )
}
