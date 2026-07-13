'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FeedbackResponsesList } from '@/components/feedback/feedback-responses-list'
import { TestimonialsManager } from '@/components/feedback/testimonials-manager'
import type { FeedbackSurvey } from '@/types/feedback'

interface FeedbackContentProps {
  responses: FeedbackSurvey[]
  testimonials: FeedbackSurvey[]
  canManage: boolean
}

/**
 * Client tabs wrapping the two office-facing feedback views: the response
 * feed (FB7) and the testimonial approval queue (FB9).
 */
export function FeedbackContent({ responses, testimonials, canManage }: FeedbackContentProps) {
  return (
    <Tabs defaultValue="responses">
      <TabsList>
        <TabsTrigger value="responses">Responses ({responses.length})</TabsTrigger>
        <TabsTrigger value="testimonials">Testimonials ({testimonials.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="responses" className="mt-4">
        <FeedbackResponsesList surveys={responses} />
      </TabsContent>
      <TabsContent value="testimonials" className="mt-4">
        <TestimonialsManager testimonials={testimonials} canManage={canManage} />
      </TabsContent>
    </Tabs>
  )
}
