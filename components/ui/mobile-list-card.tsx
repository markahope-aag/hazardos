import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileListCardProps {
  // Where the primary tap target navigates — usually the detail page.
  href?: string
  // Top-left identifier (e.g. "EST-2025-0042"). Renders as a Link when href set.
  identifier: ReactNode
  // Optional pill / status badge in the top-right.
  badge?: ReactNode
  // Primary descriptive line (project name, contact name, etc.).
  title?: ReactNode
  // Secondary descriptive line (customer, address, etc.).
  subtitle?: ReactNode
  // Compact key/value meta strip rendered as the bottom row(s).
  meta?: ReactNode
  // Optional row-action menu rendered top-right (replaces badge slot row).
  actions?: ReactNode
  className?: string
}

/**
 * Card row used for mobile-only renderings of list views — a stacked,
 * tap-friendly counterpart to the existing desktop table rows. Wrap in
 * `<div className="md:hidden">` (and the table in `hidden md:block`).
 */
export function MobileListCard({
  href,
  identifier,
  badge,
  title,
  subtitle,
  meta,
  actions,
  className,
}: MobileListCardProps) {
  const idNode = href ? (
    <Link
      href={href}
      className="font-medium text-primary hover:underline truncate"
    >
      {identifier}
    </Link>
  ) : (
    <span className="font-medium truncate">{identifier}</span>
  )

  return (
    <div
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-2',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {idNode}
          {href && !actions && (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
        {actions && <div className="shrink-0 -mr-2 -mt-1">{actions}</div>}
      </div>
      {title && (
        <div className="text-sm font-medium truncate">{title}</div>
      )}
      {subtitle && (
        <div className="text-sm text-muted-foreground truncate">
          {subtitle}
        </div>
      )}
      {meta && (
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 pt-1">
          {meta}
        </div>
      )}
    </div>
  )
}
