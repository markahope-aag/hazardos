'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RatingStars } from '@/components/feedback/rating-stars'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Check, X, Quote, Loader2 } from 'lucide-react'
import type { FeedbackSurvey } from '@/types/feedback'

type TestimonialFilter = 'pending' | 'approved' | 'all'

interface TestimonialsManagerProps {
  /** Completed surveys that contain testimonial text */
  testimonials: FeedbackSurvey[]
  canManage: boolean
}

const FILTERS: { value: TestimonialFilter; label: string }[] = [
  { value: 'pending', label: 'Pending approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'all', label: 'All' },
]

/**
 * Testimonial review queue (FB9). Admins approve or unapprove customer
 * testimonials before they can be used publicly. A testimonial is
 * "pending" once the customer granted permission but no one has approved
 * it yet.
 */
export function TestimonialsManager({ testimonials, canManage }: TestimonialsManagerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [filter, setFilter] = useState<TestimonialFilter>('pending')
  const [pendingId, setPendingId] = useState<string | null>(null)

  const filtered = testimonials.filter((t) => {
    if (filter === 'approved') return t.testimonial_approved
    if (filter === 'pending') return !t.testimonial_approved && t.testimonial_permission
    return true
  })

  const setApproval = async (surveyId: string, approve: boolean) => {
    setPendingId(surveyId)
    try {
      const response = await fetch(`/api/feedback/${surveyId}/approve-testimonial`, {
        method: approve ? 'POST' : 'DELETE',
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update testimonial')
      }
      toast({
        title: approve ? 'Testimonial approved' : 'Testimonial unapproved',
      })
      router.refresh()
    } catch (err) {
      toast({
        title: 'Something went wrong',
        description: err instanceof Error ? err.message : 'Failed to update testimonial',
        variant: 'destructive',
      })
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? 'default' : 'outline'}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <Quote className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">No testimonials in this view</p>
          <p className="text-sm">
            {filter === 'pending'
              ? 'Testimonials awaiting approval will appear here.'
              : 'Nothing to show for this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((t) => (
            <div key={t.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-medium">
                    {t.customer_name || t.customer?.name || 'Customer'}
                    {t.customer_company && (
                      <span className="text-muted-foreground font-normal"> · {t.customer_company}</span>
                    )}
                  </p>
                  <div className="mt-1">
                    <RatingStars value={t.rating_overall} />
                  </div>
                </div>
                {t.testimonial_approved ? (
                  <Badge className="bg-green-100 text-green-800">Approved</Badge>
                ) : t.testimonial_permission ? (
                  <Badge className="bg-yellow-100 text-yellow-800">Pending approval</Badge>
                ) : (
                  <Badge variant="secondary">No permission</Badge>
                )}
              </div>

              <p className="mt-3 text-sm border-l-2 border-muted pl-3 italic">
                “{t.testimonial_text}”
              </p>

              {canManage && (
                <div className="mt-4 flex gap-2">
                  {t.testimonial_approved ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pendingId === t.id}
                      onClick={() => setApproval(t.id, false)}
                    >
                      {pendingId === t.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 mr-2" />
                      )}
                      Unapprove
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={pendingId === t.id || !t.testimonial_permission}
                      onClick={() => setApproval(t.id, true)}
                    >
                      {pendingId === t.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Approve
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
