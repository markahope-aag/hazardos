'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'

/**
 * Imports a pre-defined series of industry events for the current org.
 * Today the only template is NARI of Madison 2026; structured as a
 * dropdown so adding more (AHCA, OSHA training schedules, regional
 * remodelers' associations) is just a new menu item later.
 */
export function ImportIndustryEventsButton() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [importing, setImporting] = useState<string | null>(null)

  const importNari = async () => {
    setImporting('nari')
    try {
      const res = await fetch('/api/calendar/industry-events/import-nari', {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Import failed')
      }
      const data = await res.json()
      const inserted: number = data?.inserted ?? 0
      toast({
        title: inserted > 0 ? 'NARI of Madison 2026 events imported' : 'Already imported',
        description:
          inserted > 0
            ? `Added ${inserted} event${inserted === 1 ? '' : 's'} to your calendar.`
            : 'These events are already on your calendar.',
      })
      // Bust any cached calendar queries so the events appear immediately.
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
      // The calendar view fetches via plain fetch() not TanStack Query,
      // so soft-reload by triggering a page event the view can react to.
      // For now, just nudge the user — the events will appear on the
      // next month/week navigation or page refresh.
      window.dispatchEvent(new CustomEvent('industry-events-imported'))
    } catch (err) {
      toast({
        title: 'Could not import events',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setImporting(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={!!importing}>
          {importing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CalendarPlus className="h-4 w-4 mr-2" />
          )}
          Import event series
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={importNari} disabled={!!importing}>
          {importing === 'nari' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-2 text-amber-600" />
          )}
          NARI of Madison 2026
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
