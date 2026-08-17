'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * An underline tab strip that assistive technology can actually read.
 *
 * Several detail screens hand-rolled this as a row of plain buttons. Visually
 * that is a tab set; to a screen reader it was several unrelated buttons, with
 * no indication of how many tabs existed, which was current, or that arrow keys
 * should move between them. The 2026-08-16 audit found five screens doing it,
 * all of them primary CRM pages.
 *
 * Radix Tabs is used elsewhere in the codebase and is the better default, but
 * these screens render their panels as separate conditional blocks rather than
 * as children of a Tabs root, so adopting it would mean restructuring some very
 * large components. This keeps their existing shape and supplies the behavior
 * the pattern was missing:
 *
 *   - a `tablist` wrapper, so the set is announced as a set
 *   - `aria-selected` and `aria-controls` per tab
 *   - roving tabindex, so Tab enters and leaves the strip once rather than
 *     stepping through every tab
 *   - Arrow keys to move between tabs, Home and End to jump to the ends,
 *     which is what the WAI-ARIA tabs pattern expects
 *
 * Give each panel `id={tabPanelId(baseId, tab.id)}` and `role="tabpanel"` so
 * `aria-controls` resolves.
 */

export interface TabStripItem {
  id: string
  label: string
}

export function tabId(baseId: string, id: string) {
  return `${baseId}-tab-${id}`
}

export function tabPanelId(baseId: string, id: string) {
  return `${baseId}-panel-${id}`
}

interface TabStripProps<T extends string> {
  tabs: readonly TabStripItem[]
  value: T
  onChange: (id: T) => void
  /** Prefix for the generated tab and panel ids. Must be unique on the page. */
  baseId: string
  /** Names the tab set for screen readers, e.g. "Job sections". */
  label: string
  className?: string
}

export function TabStrip<T extends string>({
  tabs,
  value,
  onChange,
  baseId,
  label,
  className,
}: TabStripProps<T>) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  const move = (from: number, delta: number) => {
    // Wraps at both ends, which is what the pattern specifies and what people
    // expect once they realize the arrows work at all.
    const next = (from + delta + tabs.length) % tabs.length
    const target = tabs[next]
    onChange(target.id as T)
    refs.current[target.id]?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault()
        move(index, 1)
        break
      case 'ArrowLeft':
        e.preventDefault()
        move(index, -1)
        break
      case 'Home':
        e.preventDefault()
        move(0, 0)
        break
      case 'End':
        e.preventDefault()
        move(tabs.length - 1, 0)
        break
    }
  }

  return (
    <div role="tablist" aria-label={label} className={cn('flex space-x-1 border-b', className)}>
      {tabs.map((tab, index) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            id={tabId(baseId, tab.id)}
            ref={(el) => {
              refs.current[tab.id] = el
            }}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={tabPanelId(baseId, tab.id)}
            // Roving tabindex: only the selected tab is in the tab order, so a
            // keyboard user reaches the strip once and then uses the arrows.
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id as T)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              // A visible focus ring matters more here than usual, because
              // arrow-key movement is invisible without one.
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              selected
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
