'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  AlertTriangle, Check, Clock, Copy, Globe, Loader2, Mail, RefreshCw, Save, Send, Trash2, XCircle,
} from 'lucide-react'

interface DnsRecord {
  type: 'TXT' | 'MX' | 'CNAME'
  name: string
  value: string
  priority?: number
  purpose?: string
}

interface DomainState {
  domain: string | null
  status: 'pending' | 'verified' | 'failed' | null
  records: DnsRecord[]
  verifiedAt: string | null
}

interface EmailSettingsState {
  email_from_name: string
  email_reply_to: string
  organization_name: string
}

export default function EmailSettingsPage() {
  const { toast } = useToast()
  const [loadingOrg, setLoadingOrg] = useState(true)
  const [loadingDomain, setLoadingDomain] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settings, setSettings] = useState<EmailSettingsState>({
    email_from_name: '',
    email_reply_to: '',
    organization_name: '',
  })
  const [domain, setDomain] = useState<DomainState>({
    domain: null,
    status: null,
    records: [],
    verifiedAt: null,
  })
  const [newDomainInput, setNewDomainInput] = useState('')
  const [submittingDomain, setSubmittingDomain] = useState(false)
  const [refreshingDomain, setRefreshingDomain] = useState(false)
  const [removingDomain, setRemovingDomain] = useState(false)
  const [testRecipient, setTestRecipient] = useState('')
  const [sendingTest, setSendingTest] = useState(false)

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/organizations/me')
      if (!res.ok) throw new Error('Failed to load organization')
      const data = await res.json()
      const org = data.organization || {}
      setSettings({
        email_from_name: org.email_from_name || '',
        email_reply_to: org.email_reply_to || '',
        organization_name: org.name || '',
      })
    } finally {
      setLoadingOrg(false)
    }
  }, [])

  const loadDomain = useCallback(async () => {
    try {
      const res = await fetch('/api/organizations/me/email-domain')
      if (!res.ok) throw new Error('Failed to load domain status')
      const data = await res.json()
      setDomain({
        domain: data.domain,
        status: data.status,
        records: data.records || [],
        verifiedAt: data.verifiedAt,
      })
    } finally {
      setLoadingDomain(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
    loadDomain()
  }, [loadSettings, loadDomain])

  // Poll while the domain is pending — Resend typically verifies within
  // seconds once DNS records propagate, but can take a few minutes.
  useEffect(() => {
    if (domain.status !== 'pending') return
    const interval = setInterval(() => {
      handleRefreshDomain(true)
    }, 10_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain.status])

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      const res = await fetch('/api/organizations/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_from_name: settings.email_from_name,
          email_reply_to: settings.email_reply_to,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      toast({ title: 'Email settings saved' })
    } catch (e) {
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSavingSettings(false)
    }
  }

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDomainInput.trim()) return
    setSubmittingDomain(true)
    try {
      const res = await fetch('/api/organizations/me/email-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomainInput.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Failed to add domain')
      }
      const data = await res.json()
      setDomain({
        domain: data.domain,
        status: data.status,
        records: data.records || [],
        verifiedAt: null,
      })
      setNewDomainInput('')
      toast({
        title: 'Domain added',
        description: 'Add the DNS records below to finish verification.',
      })
    } catch (e) {
      toast({
        title: 'Could not add domain',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSubmittingDomain(false)
    }
  }

  const handleRefreshDomain = async (silent = false) => {
    setRefreshingDomain(true)
    try {
      const res = await fetch('/api/organizations/me/email-domain', { method: 'PATCH' })
      if (!res.ok) throw new Error('Refresh failed')
      const data = await res.json()
      setDomain({
        domain: data.domain,
        status: data.status,
        records: data.records || [],
        verifiedAt: data.verifiedAt ?? null,
      })
      if (!silent && data.status === 'verified') {
        toast({ title: 'Domain verified', description: "You're now sending from your own domain." })
      }
    } catch (e) {
      if (!silent) {
        toast({
          title: 'Refresh failed',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'destructive',
        })
      }
    } finally {
      setRefreshingDomain(false)
    }
  }

  const handleRemoveDomain = async () => {
    if (!confirm(`Remove ${domain.domain}? Emails will revert to the shared sender.`)) return
    setRemovingDomain(true)
    try {
      const res = await fetch('/api/organizations/me/email-domain', { method: 'DELETE' })
      if (!res.ok) throw new Error('Remove failed')
      setDomain({ domain: null, status: null, records: [], verifiedAt: null })
      toast({ title: 'Domain removed' })
    } catch (e) {
      toast({
        title: 'Remove failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setRemovingDomain(false)
    }
  }

  const handleSendTest = async () => {
    setSendingTest(true)
    try {
      const res = await fetch('/api/organizations/me/email-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testRecipient ? { to: testRecipient.trim() } : {}),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Test send failed')
      }
      const data = await res.json()
      toast({
        title: 'Test email sent',
        description: `Delivered to ${data.to} from ${data.sender.fromEmail}`,
      })
    } catch (e) {
      toast({
        title: 'Test send failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSendingTest(false)
    }
  }

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast({ title: `${label} copied` })
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' })
    }
  }

  const effectiveFromName = settings.email_from_name || settings.organization_name || 'Your Company'
  const previewFromDomain =
    domain.status === 'verified' && domain.domain
      ? domain.domain
      : 'send.hazardos.app'

  if (loadingOrg || loadingDomain) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Mail className="h-6 w-6" />
          Email
        </h1>
        <p className="text-muted-foreground">
          How HazardOS sends transactional email on your behalf — invoices, reminders,
          estimates, and ad-hoc messages to contacts.
        </p>
      </div>

      {/* From-address preview */}
      <Card>
        <CardHeader>
          <CardTitle>Sender</CardTitle>
          <CardDescription>
            This is what your customer sees in their inbox.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-4 text-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Preview</div>
            <div className="font-mono text-sm">
              <span className="font-semibold">{effectiveFromName}</span>{' '}
              <span className="text-muted-foreground">
                &lt;no-reply@{previewFromDomain}&gt;
              </span>
            </div>
            {settings.email_reply_to && (
              <div className="font-mono text-xs text-muted-foreground mt-1">
                Reply-To: {settings.email_reply_to}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="from_name">Display name</Label>
              <Input
                id="from_name"
                value={settings.email_from_name}
                onChange={(e) => setSettings((s) => ({ ...s, email_from_name: e.target.value }))}
                placeholder={settings.organization_name}
                maxLength={120}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Defaults to your company name.
              </p>
            </div>
            <div>
              <Label htmlFor="reply_to">Reply-To email</Label>
              <Input
                id="reply_to"
                type="email"
                value={settings.email_reply_to}
                onChange={(e) => setSettings((s) => ({ ...s, email_reply_to: e.target.value }))}
                placeholder="you@yourcompany.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Where replies land when a customer responds to a system email.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Save</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test send — proves the whole stack (API key, from-address
          resolution, DNS / DKIM) end-to-end without having to create
          a contact and click through the composer. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send a Test Email
          </CardTitle>
          <CardDescription>
            Fires a real send through the Resend pipeline so you can check
            the inbox, verify DKIM/SPF pass, and confirm the audit row
            flips from <code className="font-mono text-xs">sent</code> to{' '}
            <code className="font-mono text-xs">delivered</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <Label htmlFor="test_to">Recipient (optional)</Label>
              <Input
                id="test_to"
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="Defaults to your account email"
              />
            </div>
            <Button onClick={handleSendTest} disabled={sendingTest}>
              {sendingTest ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Send Test</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Domain verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Custom Sending Domain
          </CardTitle>
          <CardDescription>
            By default, emails send from a HazardOS-shared domain. Verify your own
            domain (like <code className="font-mono text-xs">acmeremediation.com</code>) for
            stronger deliverability and branding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!domain.domain ? (
            <form onSubmit={handleAddDomain} className="space-y-3">
              <div>
                <Label htmlFor="domain">Your domain</Label>
                <div className="flex gap-2">
                  <Input
                    id="domain"
                    value={newDomainInput}
                    onChange={(e) => setNewDomainInput(e.target.value)}
                    placeholder="acmeremediation.com"
                    className="flex-1"
                  />
                  <Button type="submit" disabled={submittingDomain || !newDomainInput.trim()}>
                    {submittingDomain ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Add Domain'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the apex domain (no <code className="font-mono">www.</code> or <code className="font-mono">https://</code>).
                </p>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 p-3 rounded-md border bg-muted/30">
                <div className="flex items-center gap-3 min-w-0">
                  <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-mono text-sm truncate">{domain.domain}</div>
                    {domain.verifiedAt && (
                      <div className="text-xs text-muted-foreground">
                        Verified {new Date(domain.verifiedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                <DomainStatusBadge status={domain.status} />
              </div>

              {domain.status === 'pending' && (
                <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 p-3">
                  <div className="flex gap-2 items-start">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-900 dark:text-amber-200">
                      <strong>Add these DNS records</strong> to your domain registrar
                      (GoDaddy, Cloudflare, Namecheap, etc.). We check every 10 seconds —
                      verification usually completes within minutes once records propagate.
                    </div>
                  </div>
                </div>
              )}

              {domain.status === 'failed' && (
                <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 p-3">
                  <div className="flex gap-2 items-start">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-red-900 dark:text-red-200">
                      Verification failed. Double-check that all DNS records below are
                      added exactly as shown, then click Refresh.
                    </div>
                  </div>
                </div>
              )}

              {domain.records.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">DNS records</div>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr className="text-left text-muted-foreground">
                          <th className="py-2 px-3 font-medium">Type</th>
                          <th className="py-2 px-3 font-medium">Name / Host</th>
                          <th className="py-2 px-3 font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {domain.records.map((r, i) => (
                          <tr key={i} className="border-t">
                            <td className="py-2 px-3 font-mono align-top">
                              {r.type}
                              {r.priority != null && (
                                <div className="text-muted-foreground">Priority {r.priority}</div>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono break-all align-top">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(r.name, 'Name')}
                                className="hover:text-primary inline-flex items-center gap-1"
                                title="Copy"
                              >
                                {r.name}
                                <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                              </button>
                            </td>
                            <td className="py-2 px-3 font-mono break-all align-top">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(r.value, 'Value')}
                                className="hover:text-primary inline-flex items-start gap-1 text-left"
                                title="Copy"
                              >
                                <span className="flex-1">{r.value}</span>
                                <Copy className="h-3 w-3 flex-shrink-0 opacity-60" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveDomain}
                  disabled={removingDomain}
                  className="text-red-600 hover:text-red-700"
                >
                  {removingDomain ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Remove Domain
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRefreshDomain(false)}
                  disabled={refreshingDomain}
                >
                  {refreshingDomain ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh Status
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DomainStatusBadge({ status }: { status: DomainState['status'] }) {
  if (status === 'verified') {
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">
        <Check className="h-3 w-3 mr-1" />
        Verified
      </Badge>
    )
  }
  if (status === 'failed') {
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    )
  }
  if (status === 'pending') {
    return (
      <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    )
  }
  return <Badge variant="outline">Unknown</Badge>
}
