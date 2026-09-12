import type { CardView } from '../types'

export const STARTING_BALANCE = 10_000_000

/** Quick-sell values, scaled the way FUT scales discard values. */
const QUICK_SELL: Record<string, number> = {
  bronze: 20,
  'bronze-rare': 50,
  silver: 200,
  'silver-rare': 400,
  gold: 600,
  'gold-rare': 1500,
  special: 15000,
}

export function quickSellValue(card: CardView): number {
  if (card.special) return QUICK_SELL.special
  return QUICK_SELL[card.rare ? `${card.tier}-rare` : card.tier]
}

export function formatEuros(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
}
