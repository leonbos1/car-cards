/**
 * A generated badge for a marque.
 *
 * Real manufacturer logos are trademarks, and unlike the car photographs they
 * are not available under the free licences this project relies on — Commons
 * holds most of them as non-free. So rather than ship something the project has
 * no right to, each marque gets a monogram in a colour derived from its own
 * name: stable, distinct at a glance, and ours to use.
 */

/** Same hash everywhere, so a marque always gets the same colour. */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Marques whose everyday short form is not what the rules below would produce. */
const SHORT_FORM: Record<string, string> = {
  volkswagen: 'VW',
  'mercedes-benz': 'MB',
  'mercedes-amg': 'AMG',
  'rolls-royce': 'RR',
  'land rover': 'LR',
  'range rover': 'RR',
  'aston martin': 'AM',
  'alfa romeo': 'AR',
  'great wall': 'GW',
  'force motors': 'FM',
}

function monogram(make: string): string {
  const known = SHORT_FORM[make.toLowerCase()]
  if (known) return known
  // A marque already written as an acronym keeps it: BMW, MG, SEAT, BYD.
  if (make.length <= 4 && make === make.toUpperCase()) return make
  const words = make.split(/[\s-]+/).filter(Boolean)
  if (words.length > 1) return words.slice(0, 3).map((w) => w[0]).join('').toUpperCase()
  return make.slice(0, 2).toUpperCase()
}

export function BrandBadge({ make, size = 48 }: { make: string; size?: number }) {
  const hue = hash(make) % 360
  const text = monogram(make)
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-xl font-black leading-none"
      style={{
        width: size,
        height: size,
        // Two stops of the same hue read as a badge rather than a flat swatch.
        background: `linear-gradient(140deg, hsl(${hue} 58% 46%), hsl(${(hue + 28) % 360} 52% 28%))`,
        color: 'rgba(255,255,255,.94)',
        fontSize: size * (text.length > 2 ? 0.3 : 0.36),
        letterSpacing: '.02em',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.22)',
      }}
    >
      {text}
    </span>
  )
}
