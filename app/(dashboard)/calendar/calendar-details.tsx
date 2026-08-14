'use client'

import { format, isSameDay, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { MapPin, FileText, FileSignature, Download, ExternalLink, ClipboardList, AlertTriangle, CalendarIcon, Phone, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { jobStatusConfig } from '@/types/jobs'
import Link from 'next/link'
import { useJobDocuments } from '@/lib/hooks/use-job-documents'
import { JobDocumentsService } from '@/lib/supabase/job-documents'
import type { JobDocumentCategory } from '@/types/database'
import type { CalendarEvent, CalendarJob, CalendarSurvey, EventContact, ExternalEvent, IndustryEvent, RegulatoryDeadline } from './calendar-types'
import { parseLocalDate, INDUSTRY_CATEGORY_LABELS, collectContacts } from './calendar-types'
/**
 * The detail panels shown when a calendar entry is opened. Leaf components,
 * one per event kind, split out of calendar-view.tsx.
 */

// tel: and sms: want digits. Keep a leading + so international numbers
// still dial; strip everything else the office typed for readability.
function dialable(phone: string): string {
  const trimmed = phone.trim()
  const digits = trimmed.replace(/\D/g, '')
  return trimmed.startsWith('+') ? `+${digits}` : digits
}

/**
 * Phone numbers on a calendar entry, each labeled with whose it is, with
 * call and text actions.
 *
 * The crew opens this on a phone in a driveway. A bare number with no name
 * means guessing who answers, and copying it into the dialer by hand.
 */
function ContactPhones({ contacts }: { contacts: EventContact[] }) {
  if (contacts.length === 0) return null

  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground">
        {contacts.length > 1 ? 'Phone numbers' : 'Phone'}
      </h4>
      <ul className="mt-1 space-y-2">
        {contacts.map((contact) => (
          <li
            key={`${contact.label}-${contact.phone}`}
            className="flex items-center justify-between gap-2 rounded border border-gray-200 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{contact.label}</p>
              <p className="text-sm text-muted-foreground">{contact.phone}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button asChild size="sm" variant="outline">
                <a href={`tel:${dialable(contact.phone)}`} aria-label={`Call ${contact.label}`}>
                  <Phone className="h-3.5 w-3.5" />
                  <span className="ml-1.5">Call</span>
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={`sms:${dialable(contact.phone)}`} aria-label={`Text ${contact.label}`}>
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span className="ml-1.5">Text</span>
                </a>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function EventDetail({ event }: { event: CalendarEvent }) {
  if (event.raw.kind === 'job') return <JobDetail job={event.raw.job} />
  if (event.raw.kind === 'survey') return <SurveyDetail survey={event.raw.survey} />
  if (event.raw.kind === 'deadline') return <DeadlineDetail deadline={event.raw.deadline} />
  if (event.raw.kind === 'external') return <ExternalDetail event={event.raw.event} />
  if (event.raw.kind === 'industry') return <IndustryDetail event={event.raw.event} />
  return null
}

function IndustryDetail({ event }: { event: IndustryEvent }) {
  const label = INDUSTRY_CATEGORY_LABELS[event.category] || 'Industry event'
  const startDate = event.all_day ? parseLocalDate(event.start_at) : parseISO(event.start_at)
  const endDate = event.all_day ? parseLocalDate(event.end_at) : parseISO(event.end_at)
  const multiDay = !isSameDay(startDate, endDate)
  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-amber-600" />
          {event.title}
          <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300">
            {label}
          </Badge>
        </SheetTitle>
      </SheetHeader>
      <div className="mt-6 space-y-4">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">When</h4>
          <p className="mt-1">
            {event.all_day
              ? multiDay
                ? `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d, yyyy')} (all day)`
                : `${format(startDate, 'MMM d, yyyy')} (all day)`
              : multiDay
                ? `${format(startDate, 'MMM d, h:mm a')} – ${format(endDate, 'MMM d, h:mm a')}`
                : `${format(startDate, 'MMM d, yyyy')} · ${format(startDate, 'h:mm a')} – ${format(endDate, 'h:mm a')}`}
          </p>
        </div>
        {event.location && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Location</h4>
            <p className="mt-1 flex items-center gap-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {event.location}
            </p>
          </div>
        )}
        {event.description && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Details</h4>
            <p className="mt-1 text-sm whitespace-pre-wrap">{event.description}</p>
          </div>
        )}
        {event.registration_url && (
          <div className="pt-4">
            <Button asChild variant="outline" className="w-full">
              <a href={event.registration_url} target="_blank" rel="noopener noreferrer">
                Register / more info
                <ExternalLink className="h-3.5 w-3.5 ml-2" />
              </a>
            </Button>
          </div>
        )}
      </div>
    </>
  )
}

function JobDetail({ job }: { job: CalendarJob }) {
  const statusConfig = jobStatusConfig[job.status as keyof typeof jobStatusConfig]
  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          {job.job_number}
          <Badge className={cn(statusConfig?.bgColor, statusConfig?.color)}>
            {statusConfig?.label || job.status}
          </Badge>
        </SheetTitle>
        <SheetDescription>{job.name || 'Job Details'}</SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-4">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Scheduled</h4>
          <p className="mt-1">
            {format(parseLocalDate(job.scheduled_start_date), 'MMMM d, yyyy')}
            {job.scheduled_end_date && job.scheduled_end_date !== job.scheduled_start_date && (
              <> – {format(parseLocalDate(job.scheduled_end_date), 'MMMM d, yyyy')}</>
            )}
            {job.scheduled_start_time && (
              <> at {format(parseISO(`2000-01-01T${job.scheduled_start_time}`), 'h:mm a')}</>
            )}
          </p>
        </div>
        {job.customer && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Customer</h4>
            <p className="mt-1">{job.customer.company_name || job.customer.name}</p>
          </div>
        )}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Location</h4>
          <p className="mt-1">
            {job.job_address}
            {job.job_city && <>, {job.job_city}</>}
          </p>
        </div>

        <ContactPhones
          contacts={collectContacts([
            job.contact_onsite_phone
              ? {
                  label: job.contact_onsite_name || 'On-site contact',
                  phone: job.contact_onsite_phone,
                }
              : null,
            job.customer
              ? {
                  label: job.customer.company_name || job.customer.name,
                  phone: job.customer.phone || '',
                }
              : null,
          ])}
        />

        <SelectedJobAttachments jobId={job.id} proposalId={job.proposal_id} />

        <div className="pt-4">
          <Button asChild className="w-full">
            <Link href={`/jobs/${job.id}`}>View Job</Link>
          </Button>
        </div>
      </div>
    </>
  )
}

function SurveyDetail({ survey }: { survey: CalendarSurvey }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-purple-600" />
          {survey.job_name}
          <Badge variant="outline" className="border-purple-300 text-purple-800">
            Survey
          </Badge>
        </SheetTitle>
        <SheetDescription>
          {survey.hazard_type ? `${survey.hazard_type} survey` : 'Site survey'}
        </SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-4">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Scheduled</h4>
          <p className="mt-1">
            {format(parseLocalDate(survey.scheduled_date), 'MMMM d, yyyy')}
            {survey.scheduled_time_start && (
              <> at {format(parseISO(`2000-01-01T${survey.scheduled_time_start}`), 'h:mm a')}</>
            )}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Customer</h4>
          <p className="mt-1">{survey.customer_name}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Location</h4>
          <p className="mt-1">
            {survey.site_address}
            {survey.site_city && <>, {survey.site_city}</>}
          </p>
        </div>
        <ContactPhones
          contacts={collectContacts([
            { label: survey.customer_name, phone: survey.customer_phone || '' },
            survey.customer
              ? {
                  label:
                    survey.customer.company_name ||
                    survey.customer.name ||
                    survey.customer_name,
                  phone: survey.customer.phone || '',
                }
              : null,
          ])}
        />
        {survey.assignee && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Assigned to</h4>
            <p className="mt-1">
              {[survey.assignee.first_name, survey.assignee.last_name].filter(Boolean).join(' ')}
            </p>
          </div>
        )}
        <div className="pt-4">
          <Button asChild className="w-full">
            <Link href={`/site-surveys/${survey.id}`}>View Survey</Link>
          </Button>
        </div>
      </div>
    </>
  )
}

function DeadlineDetail({ deadline }: { deadline: RegulatoryDeadline }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2 text-red-900">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          {deadline.label}
        </SheetTitle>
        <SheetDescription>Compliance deadline derived from job schedule</SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-4">
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          The EPA NESHAP rule requires written notification to the relevant agency
          <strong> 10 working days </strong>
          before any asbestos abatement begins. Missing this is a per-day fine.
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Due</h4>
          <p className="mt-1 font-medium">
            {format(parseLocalDate(deadline.deadline_date), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Job</h4>
          <p className="mt-1">
            {deadline.job_number}
            {deadline.job_name ? ` — ${deadline.job_name}` : ''}
          </p>
          {deadline.customer_name && (
            <p className="text-sm text-muted-foreground">{deadline.customer_name}</p>
          )}
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">Job starts</h4>
          <p className="mt-1">{format(parseLocalDate(deadline.job_start_date), 'MMMM d, yyyy')}</p>
        </div>
        <div className="pt-4">
          <Button asChild className="w-full">
            <Link href={`/jobs/${deadline.job_id}`}>Open Job</Link>
          </Button>
        </div>
      </div>
    </>
  )
}

function ExternalDetail({ event }: { event: ExternalEvent }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          {event.summary}
          <Badge variant="outline">Google Calendar</Badge>
        </SheetTitle>
      </SheetHeader>
      <div className="mt-6 space-y-4">
        {event.start && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">When</h4>
            <p className="mt-1">
              {event.all_day ? (
                'All day'
              ) : (
                format(parseISO(event.start), 'MMM d, yyyy h:mm a')
              )}
            </p>
          </div>
        )}
        {event.location && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Location</h4>
            <p className="mt-1">{event.location}</p>
          </div>
        )}
        {event.html_link && (
          <div className="pt-4">
            <Button asChild variant="outline" className="w-full">
              <a href={event.html_link} target="_blank" rel="noopener noreferrer">
                Open in Google Calendar
                <ExternalLink className="h-3.5 w-3.5 ml-2" />
              </a>
            </Button>
          </div>
        )}
      </div>
    </>
  )
}

const CATEGORY_LABEL: Record<JobDocumentCategory, string> = {
  permit: 'Permit',
  manifest: 'Waste manifest',
  waste_label: 'Waste labels',
  clearance: 'Clearance report',
  air_monitoring: 'Air monitoring',
  insurance: 'Insurance (COI)',
  regulatory: 'Regulatory notification',
  customer_signoff: 'Customer sign-off',
  correspondence: 'Correspondence',
  video: 'Video',
  daily_log: 'Daily log',
  opp: 'OPP',
  other: 'Other',
}

// Small block embedded in the calendar's job popup. Pulls the job's
// documents from the DB and surfaces the linked proposal (if any) so
// the user doesn't have to open the full job detail page just to grab
// a permit or send the proposal.
function SelectedJobAttachments({
  jobId,
  proposalId,
}: {
  jobId: string
  proposalId: string | null
}) {
  const { data: documents = [], isLoading } = useJobDocuments(jobId)

  const handleOpen = async (storagePath: string) => {
    try {
      const url = await JobDocumentsService.getSignedUrl(storagePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      // Errors surface through the hook's toast on the full tab; here
      // we silently swallow so the popup doesn't steal focus.
    }
  }

  return (
    <div className="border-t pt-4 space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Attachments</h4>

      {proposalId && (
        <Link
          href={`/proposals/${proposalId}`}
          className="flex items-center justify-between gap-2 rounded border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
        >
          <span className="flex items-center gap-2 min-w-0">
            <FileSignature className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="truncate">Proposal</span>
          </span>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
      )}

      {isLoading ? (
        <div className="text-xs text-muted-foreground">Loading documents…</div>
      ) : documents.length === 0 ? (
        !proposalId && (
          <div className="text-xs text-muted-foreground">
            No documents attached. Open the job to upload permits, manifests, videos, etc.
          </div>
        )
      ) : (
        <ul className="space-y-1">
          {documents.map((doc) => (
            <li key={doc.id}>
              <button
                type="button"
                onClick={() => handleOpen(doc.storage_path)}
                className="flex items-center justify-between gap-2 w-full rounded border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 text-left"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="truncate">{doc.file_name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                    {CATEGORY_LABEL[doc.category as JobDocumentCategory]}
                  </span>
                </span>
                <Download className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
