'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Calendar, Copy, RefreshCw, Loader2 } from 'lucide-react'

/**
 * Personal iCal subscribe URL — pasted into Apple/Google/Outlook
 * Calendar so the user's assigned jobs and surveys appear in their
 * personal calendar app. Field crews live in the phone calendar,
 * not the dashboard, so this is the calendar feature that actually
 * gets used in the field.
 */
export function MyCalendarFeedCard() {
  const { toast } = useToast()
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [rotating, setRotating] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/calendar/my-feed')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setUrl(data.url ?? null)
      })
      .catch(() => {
        if (!cancelled) setUrl(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const copy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: 'Copied', description: 'Subscribe URL copied to clipboard' })
    } catch {
      toast({ title: 'Copy failed', description: 'Select and copy manually', variant: 'destructive' })
    }
  }

  const rotate = async () => {
    if (!confirm('Rotate the subscribe URL? Existing calendar subscriptions will stop syncing until you re-add the new URL.')) {
      return
    }
    setRotating(true)
    try {
      const res = await fetch('/api/calendar/my-feed', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to rotate')
      const data = await res.json()
      setUrl(data.url)
      toast({ title: 'Rotated', description: 'New subscribe URL generated' })
    } catch {
      toast({ title: 'Rotate failed', description: 'Try again', variant: 'destructive' })
    } finally {
      setRotating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 mt-1 text-muted-foreground" />
          <div>
            <CardTitle>My calendar subscription</CardTitle>
            <CardDescription>
              Subscribe in Apple, Google, or Outlook Calendar to see your assigned jobs and surveys on your phone.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : url ? (
          <>
            <div className="flex gap-2">
              <Input value={url} readOnly className="font-mono text-xs" onClick={(e) => e.currentTarget.select()} />
              <Button variant="outline" size="icon" onClick={copy} aria-label="Copy URL">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Treat this URL like a password — anyone with it can read your schedule. Rotate to revoke it.
            </p>
            <Button variant="outline" size="sm" onClick={rotate} disabled={rotating}>
              {rotating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Rotate URL
            </Button>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">Subscribe URL unavailable.</div>
        )}
      </CardContent>
    </Card>
  )
}
