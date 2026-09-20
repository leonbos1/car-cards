import { AnimatePresence, motion } from 'framer-motion'
import IMAGES from '../data/car-images.json'
import { formatEuros, quickSellValue } from '../game/economy'
import { deriveOffroadSpecs } from '../game/offroad'
import type { CardView } from '../types'
import { CarCard } from './CarCard'

const images = IMAGES as Record<
  string,
  { file: string; artist: string; license: string; sourceUrl: string }
>

interface Props {
  card: CardView | null
  owned: number
  onClose: () => void
  onSell?: (carId: string) => void
}

export function CardDetail({ card, owned, onClose, onSell }: Props) {
  const offroad = card ? deriveOffroadSpecs(card) : null

  return (
    <AnimatePresence>
      {card && offroad && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="flex max-h-full w-full max-w-3xl flex-col gap-6 overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1120] p-6 sm:flex-row"
            initial={{ scale: 0.92, y: 18 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto shrink-0">
              <CarCard card={card} scale={0.82} />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-2xl font-extrabold leading-tight">
                {card.make} {card.model}
              </h3>
              <p className="mb-4 text-sm text-white/45">
                {card.year} · {card.country} · rated {card.overall} ·{' '}
                {card.special ? card.special.label : card.rare ? 'Rare' : 'Common'} {card.tier}
              </p>

              <dl className="mb-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Spec label="Power" value={`${card.specs.hp} hp`} />
                <Spec label="0–100 km/h" value={`${card.specs.zeroToHundred.toFixed(1)} s`} />
                <Spec label="Top speed" value={`${card.specs.topSpeed} km/h`} />
                <Spec label="Weight" value={`${card.specs.weightKg} kg`} />
                {card.special?.limitedTo && (
                  <Spec label="Units built" value={card.special.limitedTo.toLocaleString('nl-NL')} />
                )}
                <Spec label="Owned" value={`${owned}×`} />
              </dl>

              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/35">
                Chassis
              </p>
              <dl className="mb-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Spec label="Drivetrain" value={offroad.driveTrain} />
                <Spec label="Ground clearance" value={`${offroad.groundClearanceMm} mm`} />
                <Spec label="Tyres" value={offroad.tyreSize} />
              </dl>

              <div className="mb-5 flex items-center gap-3">
                <span className="text-sm text-white/45">
                  Quick-sell {formatEuros(quickSellValue(card))}
                </span>
                {onSell && owned > 1 && (
                  <button
                    type="button"
                    onClick={() => onSell(card.id)}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20"
                  >
                    Sell one duplicate
                  </button>
                )}
              </div>

              <Credit id={card.id} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-white/35">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  )
}

/** CC BY and CC BY-SA both require the photographer to be credited. */
function Credit({ id }: { id: string }) {
  const image = images[id]
  if (!image) return null
  return (
    <p className="border-t border-white/10 pt-3 text-[11px] leading-relaxed text-white/35">
      Photo: {image.artist} · {image.license} ·{' '}
      {image.sourceUrl ? (
        <a
          href={image.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-white/60"
        >
          Wikimedia Commons
        </a>
      ) : (
        'Wikimedia Commons'
      )}
    </p>
  )
}
