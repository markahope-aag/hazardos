'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MapPin, Phone, User, Building, DollarSign, Clock, AlertTriangle } from 'lucide-react'
import type { Job } from '@/types/jobs'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface JobDetailsProps {
  job: Job
}

export function JobDetails({ job }: JobDetailsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {job.customer && (
            <>
              <div>
                <p className="font-medium">
                  {job.customer.company_name || job.customer.name}
                </p>
                {job.customer.email && (
                  <p className="text-sm text-muted-foreground">{job.customer.email}</p>
                )}
                {job.customer.phone && (
                  <p className="text-sm text-muted-foreground">{job.customer.phone}</p>
                )}
              </div>
              <Link href={`/customers/${job.customer.id}`} className="text-sm text-primary hover:underline">
                View Customer Profile
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      {/* Job Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Job Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-medium">{job.job_address}</p>
            {(job.job_city || job.job_state) && (
              <p className="text-sm text-muted-foreground">
                {[job.job_city, job.job_state, job.job_zip].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          {job.access_notes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Access Notes</p>
              <p className="text-sm">{job.access_notes}</p>
            </div>
          )}
          {(job.gate_code || job.lockbox_code) && (
            <div className="flex gap-4">
              {job.gate_code && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Gate Code</p>
                  <p className="text-sm font-mono">{job.gate_code}</p>
                </div>
              )}
              {job.lockbox_code && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Lockbox</p>
                  <p className="text-sm font-mono">{job.lockbox_code}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Onsite Contact */}
      {(job.contact_onsite_name || job.contact_onsite_phone) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Onsite Contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            {job.contact_onsite_name && (
              <p className="font-medium">{job.contact_onsite_name}</p>
            )}
            {job.contact_onsite_phone && (
              <p className="text-sm text-muted-foreground">{job.contact_onsite_phone}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hazards */}
      {job.hazard_types && job.hazard_types.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Hazard Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {job.hazard_types.map(type => (
                <Badge key={type} variant="outline" className="capitalize">
                  {type}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Contract Amount</span>
            <span className="font-medium">{formatCurrency(job.contract_amount)}</span>
          </div>
          {job.change_order_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Change Orders</span>
              <span className="font-medium">{formatCurrency(job.change_order_amount)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between">
            <span className="font-medium">Final Amount</span>
            <span className="font-bold text-lg">{formatCurrency(job.final_amount || job.contract_amount)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Timing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {job.estimated_duration_hours && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Duration</span>
              <span>{job.estimated_duration_hours} hours</span>
            </div>
          )}
          {job.actual_start_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Started</span>
              <span>{new Date(job.actual_start_at).toLocaleString()}</span>
            </div>
          )}
          {job.actual_end_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed</span>
              <span>{new Date(job.actual_end_at).toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Related */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Related Records
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {job.proposal && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Proposal</span>
              <Link href={`/proposals/${job.proposal.id}`} className="text-primary hover:underline">
                {job.proposal.proposal_number}
              </Link>
            </div>
          )}
          {job.estimate && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Estimate</span>
              <Link href={`/estimates/${job.estimate.id}`} className="text-primary hover:underline">
                {job.estimate.estimate_number}
              </Link>
            </div>
          )}
          {job.site_survey && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Site Survey</span>
              <Link href={`/surveys/${job.site_survey.id}`} className="text-primary hover:underline">
                View Survey
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Special Instructions */}
      {job.special_instructions && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Special Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{job.special_instructions}</p>
          </CardContent>
        </Card>
      )}

      {/* Internal Notes */}
      {job.internal_notes && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Internal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{job.internal_notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
