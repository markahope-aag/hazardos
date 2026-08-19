'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AddressParts {
  streetAddress: string
  city: string
  state: string
  zip: string
}

interface Suggestion extends AddressParts {
  id: string
  label: string
}

interface AddressAutocompleteProps {
  id?: string
  value: string
  /** Fires on every keystroke, so the field stays usable if lookup is down. */
  onChange: (value: string) => void
  /** Fires when a suggestion is picked, with the parts to fill in. */
  onSelect: (parts: AddressParts) => void
  readOnly?: boolean
  placeholder?: string
  className?: string
}

/**
 * Street address input that suggests full addresses and fills city, state and
 * ZIP from the one that's picked.
 *
 * Typing is never blocked on the lookup. If Mapbox is slow, rate-limited or
 * misconfigured the field behaves as a plain text input, because a broken
 * address lookup must not stop someone entering a customer.
 */
export function AddressAutocomplete({
  id,
  value,
  onChange,
  onSelect,
  readOnly = false,
  placeholder,
  className,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  // Set when a suggestion is taken, so the resulting value change does not
  // immediately trigger a fresh lookup for the text we just inserted.
  const justSelectedRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  const debounced = useDebouncedValue(value, 300)

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false
      return
    }
    if (readOnly || debounced.trim().length < 3) {
      setSuggestions([])
      return
    }

    let cancelled = false
    setLoading(true)
    fetch(`/api/geocode/search?q=${encodeURIComponent(debounced.trim())}`)
      .then((res) => (res.ok ? res.json() : { suggestions: [] }))
      .then((body) => {
        if (cancelled) return
        setSuggestions(body.suggestions ?? [])
        setOpen((body.suggestions ?? []).length > 0)
      })
      // Silent on failure on purpose: the field still works as plain text and
      // an error toast on every keystroke would be worse than no suggestions.
      .catch(() => {
        if (!cancelled) setSuggestions([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debounced, readOnly])

  // Close when focus or a click goes elsewhere.
  useEffect(() => {
    if (!open) return
    const onDocumentPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDocumentPointerDown)
    return () => document.removeEventListener('pointerdown', onDocumentPointerDown)
  }, [open])

  const take = (s: Suggestion) => {
    justSelectedRef.current = true
    onSelect({ streetAddress: s.streetAddress, city: s.city, state: s.state, zip: s.zip })
    setOpen(false)
    setSuggestions([])
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
        readOnly={readOnly}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
      />

      {loading && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}

      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md"
        >
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => take(s)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
