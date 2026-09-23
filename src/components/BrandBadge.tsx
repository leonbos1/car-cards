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
  // Chamfered like a number plate on a race car rather than a rounded app icon.
  const cut = Math.round(size * 0.22)
  const plate = `polygon(0 0, calc(100% - ${cut}px) 0, 100% ${cut}px, 100% 100%, ${cut}px 100%, 0 calc(100% - ${cut}px))`
  return (
    <span
      aria-hidden
      className="relative grid shrink-0 place-items-center font-display font-extrabold italic leading-none"
      style={{
        width: size,
        height: size,
        clipPath: plate,
        // Two stops of the same hue read as a badge rather than a flat swatch.
        background: `linear-gradient(140deg, hsl(${hue} 62% 52%), hsl(${(hue + 28) % 360} 55% 24%))`,
        color: 'rgba(255,255,255,.96)',
        fontSize: size * (text.length > 2 ? 0.34 : 0.44),
        letterSpacing: '.01em',
        textShadow: '0 1px 2px rgba(0,0,0,.35)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.3), inset 0 0 0 1px rgba(255,255,255,.12)',
      }}
    >
      {/* a gloss across the top half, like light on a painted panel */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,.2), rgba(255,255,255,0))' }}
      />
      <span className="relative" style={{ paddingRight: size * 0.03 }}>
        {text}
      </span>
    </span>
  )
}
