'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import {
  MapPin, ArrowLeft, Users, Briefcase, ClipboardList, Target,
  UserMinus, Save,
} from 'lucide-react'
import {
  usePropertyHistory,
  useUpdateProperty,
  useMarkContactMovedOut,
} from '@/lib/hooks/use-properties'
import type { PropertyContactRole } from '@/types/database'

const ROLE_LABEL: Record<PropertyContactRole, string> = {
  owner: 'Owner',
  previous_owner: 'Previous owner',
  tenant: 'Tenant',
  site_contact: 'Site contact',
  billing_contact: 'Billing contact',
}

const ROLE_BADGE: Record<PropertyContactRole, string> = {
  owner: 'bg-green-100 text-green-700',
  previous_owner: 'bg-gray-100 text-gray-600',
  tenant: 'bg-blue-100 text-blue-700',
  site_contact: 'bg-purple-100 text-purple-700',
  billing_contact: 'bg-amber-100 text-amber-700',
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString()
}

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading, error } = usePropertyHistory(id)
  const updateProperty = useUpdateProperty()
  const markMovedOut = useMarkContactMovedOut()

  const [notes, setNotes] = useState<string | null>(null)
  const [notesDirty, setNotesDirty] = useState(false)
  const [movedOutForm, setMovedOutForm] = useState<{ contactId: string; date: string; note: string } | null>(null)

  const currentNotes = notes ?? data?.property.notes ?? ''

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-destructive mb-2">Property not found</div>
          <Link href="/crm/properties">
            <Button variant="outline" size="sm" className="mt-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Properties
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  const { property, contacts, site_surveys, opportunities, jobs } = data
  const current = contacts.filter((c) => c.is_current)
  const past = contacts.filter((c) => !c.is_current)

  const handleSaveNotes = () => {
    updateProperty.mutate(
      { id: property.id, updates: { notes: currentNotes } },
      { onSuccess: () => setNotesDirty(false) },
    )
  }

  const submitMovedOut = () => {
    if (!movedOutForm) return
    markMovedOut.mutate(
      { id: movedOutForm.contactId, movedOutDate: movedOutForm.date, notes: movedOutForm.note || undefined },
      { onSuccess: () => setMovedOutForm(null) },
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/crm/properties"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Properties
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <MapPin className="h-6 w-6 text-primary mt-1" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {property.address_line1}
              </h1>
              {property.address_line2 && (
                <div className="text-gray-600">{property.address_line2}</div>
              )}
              <div className="text-gray-600">
                {[property.city, property.state, property.zip].filter(Boolean).join(', ') || '—'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-500" />
            Contacts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Current ({current.length})</h3>
            {current.length === 0 ? (
              <div className="text-sm text-gray-500">No current contacts.</div>
            ) : (
              <div className="space-y-2">
                {current.map((pc) => (
                  <div
                    key={pc.id}
                    className="flex items-start justify-between gap-3 rounded border border-gray-200 p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/crm/contacts/${pc.contact?.id}`}
                          className="font-medium text-gray-900 hover:underline truncate"
                        >
                          {pc.contact?.name || 'Unknown contact'}
                        </Link>
                        <Badge className={ROLE_BADGE[pc.role]}>{ROLE_LABEL[pc.role]}</Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {pc.contact?.phone || pc.contact?.mobile_phone || pc.contact?.email || '—'}
                        {pc.moved_in_date && ` · moved in ${formatDate(pc.moved_in_date)}`}
                      </div>
                      {pc.notes && (
                        <div className="text-xs text-gray-600 mt-1 italic">{pc.notes}</div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-gray-900"
                      onClick={() =>
                        setMovedOutForm({
                          contactId: pc.id,
                          date: new Date().toISOString().slice(0, 10),
                          note: '',
                        })
                      }
                    >
                      <UserMinus className="h-4 w-4 mr-1" />
                      Moved away
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {movedOutForm && (
            <div className="rounded border border-amber-200 bg-amber-50 p-3 space-y-2">
              <div className="text-sm font-medium text-gray-800">Mark as moved away</div>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={movedOutForm.date}
                  onChange={(e) => setMovedOutForm({ ...movedOutForm, date: e.target.value })}
                  className="max-w-[180px]"
                />
                <Input
                  placeholder="Note (optional, e.g. 'moved to Denver')"
                  value={movedOutForm.note}
                  onChange={(e) => setMovedOutForm({ ...movedOutForm, note: e.target.value })}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setMovedOutForm(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={submitMovedOut} disabled={markMovedOut.isPending}>
                  Save
                </Button>
              </div>
            </div>
          )}

          {past.length > 0 && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Previously at this address ({past.length})
                </h3>
                <div className="space-y-2">
                  {past.map((pc) => (
                    <div
                      key={pc.id}
                      className="rounded border border-gray-200 bg-gray-50 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/crm/contacts/${pc.contact?.id}`}
                          className="font-medium text-gray-700 hover:underline truncate"
                        >
                          {pc.contact?.name || 'Unknown contact'}
                        </Link>
                        <Badge className={ROLE_BADGE[pc.role]}>{ROLE_LABEL[pc.role]}</Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {pc.moved_in_date && `moved in ${formatDate(pc.moved_in_date)} · `}
                        {pc.moved_out_date && `moved out ${formatDate(pc.moved_out_date)}`}
                      </div>
                      {pc.notes && (
                        <div className="text-xs text-gray-600 mt-1 italic">{pc.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-gray-500" />
            Work history
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-gray-400" />
              Jobs ({jobs.length})
            </h3>
            {jobs.length === 0 ? (
              <div className="text-sm text-gray-500">No jobs at this property.</div>
            ) : (
              <ul className="space-y-1 text-sm">
                {jobs.map((j) => (
                  <li key={j.id} className="flex items-center justify-between">
                    <Link href={`/crm/jobs/${j.id}`} className="text-primary hover:underline">
                      {j.job_number}
                    </Link>
                    <span className="text-gray-500 text-xs">
                      {j.status} · {formatDate(j.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Target className="h-4 w-4 text-gray-400" />
              Opportunities ({opportunities.length})
            </h3>
            {opportunities.length === 0 ? (
              <div className="text-sm text-gray-500">No opportunities.</div>
            ) : (
              <ul className="space-y-1 text-sm">
                {opportunities.map((o) => (
                  <li key={o.id} className="flex items-center justify-between">
                    <Link
                      href={`/crm/opportunities/${o.id}`}
                      className="text-primary hover:underline"
                    >
                      {o.name}
                    </Link>
                    <span className="text-gray-500 text-xs">
                      {o.opportunity_status || '—'} · {formatDate(o.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-gray-400" />
              Site surveys ({site_surveys.length})
            </h3>
            {site_surveys.length === 0 ? (
              <div className="text-sm text-gray-500">No site surveys.</div>
            ) : (
              <ul className="space-y-1 text-sm">
                {site_surveys.map((s) => (
                  <li key={s.id} className="flex items-center justify-between">
                    <Link href={`/site-surveys/${s.id}`} className="text-primary hover:underline">
                      {s.job_name}
                    </Link>
                    <span className="text-gray-500 text-xs">
                      {s.hazard_type} · {s.status} · {formatDate(s.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Property notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={currentNotes}
            onChange={(e) => {
              setNotes(e.target.value)
              setNotesDirty(true)
            }}
            placeholder="Notes about this property — access, prior remediation outcomes, moved-away history, etc."
            rows={5}
          />
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              disabled={!notesDirty || updateProperty.isPending}
              onClick={handleSaveNotes}
            >
              <Save className="h-4 w-4 mr-1" />
              Save notes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
