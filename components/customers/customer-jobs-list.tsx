'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Briefcase, MapPin, Calendar as CalendarIcon, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Customer } from '@/types/database'

interface CustomerJob {
  id: string
  job_number: string
  name: string | null
  status: string | null
  scheduled_start_date: string | null
  scheduled_end_date: string | null
  job_address: string | null
  job_city: string | null
  job_state: string | null
  contract_amount: number | null
  estimated_revenue: number | null
}

const STATUS_COLOR: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  invoiced: 'bg-purple-100 text-purple-700',
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  on_hold: 'bg-orange-100 text-orange-700',
}

interface Props {
  customer: Customer
}

export default function CustomerJobsList({ customer }: Props) {
  const [jobs, setJobs] = useState<CustomerJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('jobs')
        .select(
          'id, job_number, name, status, scheduled_start_date, scheduled_end_date, job_address, job_city, job_state, contract_amount, estimated_revenue',
        )
        .eq('customer_id', customer.id)
        .order('scheduled_start_date', { ascending: false, nullsFirst: false })
      if (!cancelled) {
        setJobs((data as CustomerJob[]) || [])
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [customer.id])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Briefcase className="h-5 w-5" />
          Jobs {jobs.length > 0 && <span className="text-muted-foreground font-normal">({jobs.length})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No jobs yet for this contact.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {jobs.map((job) => {
              const statusClass = job.status ? STATUS_COLOR[job.status] || 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-700'
              return (
                <li key={job.id}>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="flex items-center justify-between gap-3 py-3 px-1 hover:bg-gray-50 -mx-1 rounded"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">{job.job_number}</span>
                        {job.status && (
                          <Badge className={statusClass}>{job.status.replace(/_/g, ' ')}</Badge>
                        )}
                        {job.name && <span className="text-sm text-gray-600 truncate">— {job.name}</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                        {job.scheduled_start_date && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {new Date(job.scheduled_start_date).toLocaleDateString()}
                            {job.scheduled_end_date && job.scheduled_end_date !== job.scheduled_start_date && (
                              <> – {new Date(job.scheduled_end_date).toLocaleDateString()}</>
                            )}
                          </span>
                        )}
                        {job.job_address && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {job.job_address}
                            {job.job_city && <>, {job.job_city}</>}
                            {job.job_state && <>, {job.job_state}</>}
                          </span>
                        )}
                      </div>
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
  )
}
