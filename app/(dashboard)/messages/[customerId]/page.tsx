'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Send, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface SmsMessage {
  id: string
  direction: 'outbound' | 'inbound'
  body: string
  from_phone: string | null
  to_phone: string
  queued_at: string
  received_at: string | null
  status: string
}

interface CustomerSummary {
  id: string
  name: string | null
  company_name: string | null
  phone: string | null
  mobile_phone: string | null
  sms_opt_in: boolean | null
}

export default function MessageThreadPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = use(params)
  const { toast } = useToast()
  const [customer, setCustomer] = useState<CustomerSummary | null>(null)
  const [messages, setMessages] = useState<SmsMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    try {
      const [custRes, msgsRes] = await Promise.all([
        fetch(`/api/customers/${customerId}`),
        fetch(`/api/sms/messages?customer_id=${customerId}&limit=200`),
      ])
      if (!custRes.ok) throw new Error('Customer not found')
      const custData = await custRes.json()
      setCustomer(custData.customer || custData)

      if (msgsRes.ok) {
        const msgsData = await msgsRes.json()
        const list: SmsMessage[] = Array.isArray(msgsData) ? msgsData : (msgsData.messages || [])
        // Sort oldest → newest so the newest shows at the bottom, like every
        // other chat UI people have ever used.
        list.sort((a, b) => {
          const at = a.received_at ?? a.queued_at
          const bt = b.received_at ?? b.queued_at
          return String(at).localeCompare(String(bt))
        })
        setMessages(list)
      } else {
        setMessages([])
      }
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load thread')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    // Scroll to the newest message on each refresh.
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages.length])

  const phoneForReply = customer?.mobile_phone || customer?.phone

  const handleSend = async () => {
    if (!reply.trim() || !phoneForReply) return
    setSending(true)
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneForReply,
          body: reply.trim(),
          message_type: 'general',
          customer_id: customerId,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Send failed')
      }
      setReply('')
      await load()
    } catch (e) {
      toast({
        title: 'Failed to send',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const optedOut = customer?.sms_opt_in === false

  return (
    <div className="space-y-4">
      <Link
        href="/messages"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        All conversations
      </Link>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <AlertCircle className="h-6 w-6 text-destructive mx-auto mb-2" />
              <div className="text-sm text-gray-600">{error}</div>
            </div>
          ) : (
            <>
              <div className="border-b px-4 py-3">
                <div className="font-semibold text-gray-900">
                  <Link
                    href={`/crm/contacts/${customer?.id}`}
                    className="hover:underline"
                  >
                    {customer?.name || customer?.company_name || 'Unknown'}
                  </Link>
                </div>
                <div className="text-xs text-muted-foreground">
                  {phoneForReply || 'no phone on file'}
                  {optedOut && <span className="ml-2 text-destructive">• opted out of SMS</span>}
                </div>
              </div>

              <div ref={scrollRef} className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
                {messages.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    No messages yet.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isInbound = m.direction === 'inbound'
                    const ts = m.received_at ?? m.queued_at
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                            isInbound
                              ? 'bg-gray-100 text-gray-900'
                              : 'bg-primary text-primary-foreground'
                          }`}
                        >
                          <div className="whitespace-pre-wrap break-words">{m.body}</div>
                          <div className={`text-[10px] mt-1 ${isInbound ? 'text-gray-500' : 'text-primary-foreground/70'}`}>
                            {new Date(ts).toLocaleString()}
                            {!isInbound && ` • ${m.status}`}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="border-t p-3 space-y-2">
                {optedOut && (
                  <div className="text-xs text-destructive">
                    This customer has opted out of SMS. You can still receive inbound messages but cannot reply via text.
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <Textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={phoneForReply ? 'Type a reply…' : 'No phone on file'}
                    disabled={!phoneForReply || optedOut || sending}
                    rows={2}
                    className="flex-1 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!reply.trim() || !phoneForReply || optedOut || sending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Cmd/Ctrl+Enter to send. Opt-in is enforced — messages to customers who haven't consented will fail.
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
