'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Search, ArrowRight } from 'lucide-react'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'

interface Conversation {
  customer_id: string | null
  customer_name: string | null
  customer_phone: string | null
  last_message_body: string
  last_message_direction: string
  last_message_at: string
  unread_inbound: number
  total_messages: number
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search, 300)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (debounced) params.set('search', debounced)
        const res = await fetch(`/api/sms/conversations?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to load conversations')
        const data = await res.json()
        if (!cancelled) setConversations(data.conversations || [])
      } catch {
        if (!cancelled) setConversations([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [debounced])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-600 mt-1">
          All SMS conversations with your customers. Unread counts reflect inbound messages received since your last reply.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, or message..."
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-10 text-center">
              <MessageCircle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <div className="text-sm text-gray-600">
                {debounced
                  ? `No conversations match "${debounced}".`
                  : 'No SMS conversations yet. As you text customers and they reply, threads will appear here.'}
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {conversations.map((c) => {
                const href = c.customer_id
                  ? `/messages/${c.customer_id}`
                  : c.customer_phone
                    ? `/messages/by-phone?phone=${encodeURIComponent(c.customer_phone)}`
                    : '#'
                return (
                  <li key={(c.customer_id ?? c.customer_phone ?? 'unknown')}>
                    <Link
                      href={href}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-900 truncate">
                            {c.customer_name || c.customer_phone || 'Unknown contact'}
                          </div>
                          {c.unread_inbound > 0 && (
                            <Badge className="bg-primary text-primary-foreground">
                              {c.unread_inbound} new
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 truncate mt-0.5">
                          <span className={c.last_message_direction === 'inbound' ? 'text-gray-700' : 'text-gray-400'}>
                            {c.last_message_direction === 'inbound' ? '' : 'You: '}
                          </span>
                          {c.last_message_body}
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500 whitespace-nowrap">
                        <div>{new Date(c.last_message_at).toLocaleDateString()}</div>
                        <div>{new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
