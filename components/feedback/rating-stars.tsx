import { Star } from 'lucide-react'

interface RatingStarsProps {
  value: number | null
  /** Show the numeric value alongside the stars */
  showValue?: boolean
  className?: string
}

/**
 * Read-only 1–5 star display for feedback ratings. Renders nothing when the
 * rating is null (a survey may skip individual dimensions).
 */
export function RatingStars({ value, showValue = false, className }: RatingStarsProps) {
  if (value == null) {
    return <span className="text-sm text-muted-foreground">—</span>
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ''}`}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={
              i <= Math.round(value)
                ? 'h-4 w-4 fill-amber-400 text-amber-400'
                : 'h-4 w-4 text-muted-foreground/30'
            }
          />
        ))}
      </span>
      {showValue && <span className="text-sm font-medium">{value.toFixed(1)}</span>}
    </span>
  )
}
