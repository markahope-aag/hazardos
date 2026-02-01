'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  Bell,
  Mail,
  Smartphone,
  Loader2,
  CheckCircle,
  AlertCircle,
  Briefcase,
  FileCheck,
  DollarSign,
  MessageSquare,
  Info,
  Eye,
  ClipboardCheck,
} from 'lucide-react'
import type {
  NotificationPreference,
  NotificationType,
} from '@/types/notifications'
import { notificationTypeConfig } from '@/types/notifications'

const iconMap: Record<NotificationType, React.ReactNode> = {
  job_assigned: <Briefcase className="w-5 h-5" />,
  job_completed: <CheckCircle className="w-5 h-5" />,
  job_completion_review: <ClipboardCheck className="w-5 h-5" />,
  proposal_signed: <FileCheck className="w-5 h-5" />,
  proposal_viewed: <Eye className="w-5 h-5" />,
  invoice_paid: <DollarSign className="w-5 h-5" />,
  invoice_overdue: <AlertCircle className="w-5 h-5" />,
  invoice_viewed: <Eye className="w-5 h-5" />,
  feedback_received: <MessageSquare className="w-5 h-5" />,
  testimonial_pending: <MessageSquare className="w-5 h-5" />,
  system: <Info className="w-5 h-5" />,
  reminder: <Bell className="w-5 h-5" />,
}

const categoryGroups: { title: string; types: NotificationType[] }[] = [
  {
    title: 'Jobs',
    types: ['job_assigned', 'job_completed', 'job_completion_review'],
  },
  {
    title: 'Sales',
    types: ['proposal_signed', 'proposal_viewed'],
  },
  {
    title: 'Invoicing',
    types: ['invoice_paid', 'invoice_overdue', 'invoice_viewed'],
  },
  {
    title: 'Feedback',
    types: ['feedback_received', 'testimonial_pending'],
  },
  {
    title: 'System',
    types: ['system', 'reminder'],
  },
]

export default function NotificationSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Fetch preferences
  useEffect(() => {
    async function fetchPreferences() {
      try {
        const res = await fetch('/api/notifications/preferences')
        if (res.ok) {
          const data = await res.json()
          setPreferences(data)
        }
      } catch (err) {
        setError('Failed to load preferences')
      } finally {
        setLoading(false)
      }
    }

    fetchPreferences()
  }, [])

  // Get preference for a type
  function getPreference(type: NotificationType): NotificationPreference | undefined {
    return preferences.find((p) => p.notification_type === type)
  }

  // Update a preference
  async function updatePreference(
    type: NotificationType,
    channel: 'in_app' | 'email' | 'push',
    value: boolean
  ) {
    try {
      setSaving(`${type}-${channel}`)
      setError(null)
      setSuccess(null)

      const res = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_type: type,
          [channel]: value,
        }),
      })

      if (!res.ok) throw new Error('Failed to update preference')

      const updated = await res.json()

      setPreferences((prev) =>
        prev.map((p) => (p.notification_type === type ? updated : p))
      )

      setSuccess('Preference updated')
      setTimeout(() => setSuccess(null), 2000)
    } catch (err) {
      setError('Failed to update preference')
    } finally {
      setSaving(null)
    }
  }

  // Toggle all for a channel
  async function toggleAllForChannel(channel: 'in_app' | 'email' | 'push', value: boolean) {
    for (const pref of preferences) {
      await updatePreference(pref.notification_type as NotificationType, channel, value)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground">
          Manage how you receive notifications
        </p>
      </div>

      {/* Status messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Channel Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>
            Choose how you want to be notified for each type of event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Bell className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">In-App</p>
                <p className="text-xs text-muted-foreground">Bell notifications</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <Mail className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-muted-foreground">Email notifications</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Push</p>
                <p className="text-xs text-muted-foreground">Mobile push (coming soon)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preference Groups */}
      {categoryGroups.map((group) => (
        <Card key={group.title}>
          <CardHeader>
            <CardTitle>{group.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.types.map((type, index) => {
              const pref = getPreference(type)
              const config = notificationTypeConfig[type]

              if (!pref) return null

              return (
                <div key={type}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('p-2 rounded-lg', config.bgColor)}>
                        {iconMap[type]}
                      </div>
                      <div>
                        <p className="font-medium">{config.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {config.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* In-App */}
                      <div className="flex flex-col items-center gap-1">
                        <Switch
                          checked={pref.in_app}
                          onCheckedChange={(checked) =>
                            updatePreference(type, 'in_app', checked)
                          }
                          disabled={saving === `${type}-in_app`}
                        />
                        <span className="text-xs text-muted-foreground">In-App</span>
                      </div>

                      {/* Email */}
                      <div className="flex flex-col items-center gap-1">
                        <Switch
                          checked={pref.email}
                          onCheckedChange={(checked) =>
                            updatePreference(type, 'email', checked)
                          }
                          disabled={saving === `${type}-email`}
                        />
                        <span className="text-xs text-muted-foreground">Email</span>
                      </div>

                      {/* Push (disabled for now) */}
                      <div className="flex flex-col items-center gap-1">
                        <Switch
                          checked={pref.push}
                          onCheckedChange={(checked) =>
                            updatePreference(type, 'push', checked)
                          }
                          disabled={true}
                        />
                        <span className="text-xs text-muted-foreground">Push</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}

      {/* Bulk Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Actions</CardTitle>
          <CardDescription>
            Quickly enable or disable all notifications for a channel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => toggleAllForChannel('in_app', true)}
            >
              Enable All In-App
            </Button>
            <Button
              variant="outline"
              onClick={() => toggleAllForChannel('email', true)}
            >
              Enable All Email
            </Button>
            <Button
              variant="outline"
              onClick={() => toggleAllForChannel('in_app', false)}
            >
              Disable All In-App
            </Button>
            <Button
              variant="outline"
              onClick={() => toggleAllForChannel('email', false)}
            >
              Disable All Email
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
