'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { logger, formatError } from '@/lib/utils/logger'
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Loader2,
  Briefcase,
  FileCheck,
  DollarSign,
  MessageSquare,
  AlertCircle,
  Info,
  Eye,
  ClipboardCheck,
} from 'lucide-react'
import type { Notification, NotificationType } from '@/types/notifications'

const POLL_INTERVAL = 30000 // 30 seconds

const iconMap: Record<NotificationType, React.ReactNode> = {
  job_assigned: <Briefcase className="w-4 h-4" />,
  job_completed: <Check className="w-4 h-4" />,
  job_completion_review: <ClipboardCheck className="w-4 h-4" />,
  proposal_signed: <FileCheck className="w-4 h-4" />,
  proposal_viewed: <Eye className="w-4 h-4" />,
  invoice_paid: <DollarSign className="w-4 h-4" />,
  invoice_overdue: <AlertCircle className="w-4 h-4" />,
  invoice_viewed: <Eye className="w-4 h-4" />,
  payment_failed: <AlertCircle className="w-4 h-4" />,
  feedback_received: <MessageSquare className="w-4 h-4" />,
  testimonial_pending: <MessageSquare className="w-4 h-4" />,
  system: <Info className="w-4 h-4" />,
  reminder: <Bell className="w-4 h-4" />,
}

const colorMap: Record<NotificationType, string> = {
  job_assigned: 'bg-blue-100 text-blue-700',
  job_completed: 'bg-green-100 text-green-700',
  job_completion_review: 'bg-purple-100 text-purple-700',
  proposal_signed: 'bg-green-100 text-green-700',
  proposal_viewed: 'bg-blue-100 text-blue-700',
  invoice_paid: 'bg-green-100 text-green-700',
  invoice_overdue: 'bg-red-100 text-red-700',
  invoice_viewed: 'bg-blue-100 text-blue-700',
  payment_failed: 'bg-red-100 text-red-700',
  feedback_received: 'bg-purple-100 text-purple-700',
  testimonial_pending: 'bg-yellow-100 text-yellow-700',
  system: 'bg-gray-100 text-gray-700',
  reminder: 'bg-orange-100 text-orange-700',
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [markingRead, setMarkingRead] = useState<string | null>(null)
  const [markingAllRead, setMarkingAllRead] = useState(false)

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        fetch('/api/notifications?limit=20'),
        fetch('/api/notifications/count'),
      ])

      if (notifRes.ok) {
        const data = await notifRes.json()
        setNotifications(data)
      }

      if (countRes.ok) {
        const data = await countRes.json()
        setUnreadCount(data.count)
      }
    } catch (error) {
      logger.error(
        { error: formatError(error, 'NOTIFICATIONS_FETCH_ERROR') },
        'Failed to fetch notifications'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch and polling
  useEffect(() => {
    fetchNotifications()

    const interval = setInterval(fetchNotifications, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Mark single notification as read
  async function handleMarkAsRead(notification: Notification) {
    if (notification.is_read) {
      // If already read, just navigate
      if (notification.action_url) {
        router.push(notification.action_url)
        setOpen(false)
      }
      return
    }

    try {
      setMarkingRead(notification.id)

      const res = await fetch(`/api/notifications/${notification.id}/read`, {
        method: 'POST',
      })

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, is_read: true } : n
          )
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))

        // Navigate if has action URL
        if (notification.action_url) {
          router.push(notification.action_url)
          setOpen(false)
        }
      }
    } catch (error) {
      logger.error(
        { 
          error: formatError(error, 'NOTIFICATION_MARK_READ_ERROR'),
          notificationId: notification.id
        },
        'Failed to mark notification as read'
      )
    } finally {
      setMarkingRead(null)
    }
  }

  // Mark all as read
  async function handleMarkAllAsRead() {
    try {
      setMarkingAllRead(true)

      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
      })

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      logger.error(
        { error: formatError(error, 'NOTIFICATIONS_MARK_ALL_READ_ERROR') },
        'Failed to mark all as read'
      )
    } finally {
      setMarkingAllRead(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          {unreadCount > 0 ? (
            <BellRing className="w-5 h-5" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markingAllRead}
              className="text-xs"
            >
              {markingAllRead ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <CheckCheck className="w-3 h-3 mr-1" />
              )}
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-12 h-12 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleMarkAsRead(notification)}
                  disabled={markingRead === notification.id}
                  className={cn(
                    'w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors',
                    !notification.is_read && 'bg-blue-50/50'
                  )}
                >
                  <div className="flex gap-3">
                    <div
                      className={cn(
                        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                        colorMap[notification.type as NotificationType] || 'bg-gray-100 text-gray-700'
                      )}
                    >
                      {markingRead === notification.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        iconMap[notification.type as NotificationType] || <Bell className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            'text-sm font-medium truncate',
                            notification.is_read && 'text-muted-foreground'
                          )}
                        >
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>

                      {notification.message && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <Separator />

        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-center text-sm"
            onClick={() => {
              router.push('/notifications')
              setOpen(false)
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
