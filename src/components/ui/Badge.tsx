/** A red count bubble for something waiting. Renders nothing at zero. */
export function Badge({ count, className = '' }: { count?: number; className?: string }) {
  if (!count) return null
  return (
    <span
      className={`num inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-signal px-1 text-[11px] leading-none text-white shadow-[0_0_0_2px_var(--color-pitch)] ${className}`}
      aria-label={`${count} waiting`}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}
