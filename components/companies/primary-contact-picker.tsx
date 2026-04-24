'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronsUpDown, Loader2, UserPlus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface ContactOption {
  id: string
  name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  title: string | null
}

interface PrimaryContactPickerProps {
  companyId: string
  value: string | null
  onChange: (contactId: string | null) => void
  disabled?: boolean
}

/**
 * Searchable picker for the company's primary contact. The lookup is
 * scoped to contacts that already belong to this company (customers
 * where company_id = companyId) — keeping users from silently
 * re-parenting a contact via the primary-contact field.
 */
export function PrimaryContactPicker({
  companyId,
  value,
  onChange,
  disabled,
}: PrimaryContactPickerProps) {
  const [open, setOpen] = useState(false)
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('customers')
        .select('id, name, first_name, last_name, email, title')
        .eq('company_id', companyId)
        .order('first_name', { ascending: true })
        .limit(200)
      if (cancelled) return
      setContacts((data || []) as ContactOption[])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [companyId])

  const selected = contacts.find((c) => c.id === value) || null
  const selectedDisplay = selected ? formatName(selected) : null

  return (
    <div className="flex items-start gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className={cn(!selected && 'text-muted-foreground')}>
              {loading
                ? 'Loading contacts…'
                : selected
                ? selectedDisplay
                : contacts.length === 0
                ? 'No contacts on this company yet'
                : 'Select a primary contact…'}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50 flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
          <Command>
            <CommandInput placeholder="Search contacts…" />
            <CommandList>
              <CommandEmpty>
                {contacts.length === 0 ? (
                  <div className="py-4 px-3 text-sm text-muted-foreground">
                    <p className="mb-2">
                      This company has no contacts yet. Add one from the Contacts tab
                      and you&apos;ll be able to pick them here.
                    </p>
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No match.
                  </div>
                )}
              </CommandEmpty>
              {contacts.length > 0 && (
                <CommandGroup>
                  {contacts.map((c) => {
                    const isSelected = c.id === value
                    return (
                      <CommandItem
                        key={c.id}
                        value={searchableText(c)}
                        onSelect={() => {
                          onChange(c.id)
                          setOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            isSelected ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate">{formatName(c)}</span>
                          {(c.title || c.email) && (
                            <span className="text-xs text-muted-foreground truncate">
                              {[c.title, c.email].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange(null)}
          title="Clear primary contact"
          className="flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      {loading && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mt-3 flex-shrink-0" />
      )}
      {!loading && contacts.length === 0 && (
        <UserPlus className="h-4 w-4 text-muted-foreground mt-3 flex-shrink-0" aria-hidden />
      )}
    </div>
  )
}

function formatName(c: ContactOption): string {
  const full = [c.first_name, c.last_name].filter(Boolean).join(' ').trim()
  return full || c.name || c.email || 'Unnamed contact'
}

function searchableText(c: ContactOption): string {
  // cmdk uses `value` for match-scoring; concatenating name + email lets
  // users find contacts by either without us writing a custom filter.
  return [formatName(c), c.email, c.title].filter(Boolean).join(' ')
}
