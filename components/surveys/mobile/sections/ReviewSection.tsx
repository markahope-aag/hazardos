'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { CompletionChecklist, SurveySummary } from '../review'
import { VoiceNoteButton } from '../inputs'
import { FileCheck, Send, Loader2 } from 'lucide-react'

export function ReviewSection() {
  const { formData, updateNotes, validateAll } = useSurveyStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isComplete = validateAll()

  const handleSubmit = async () => {
    if (!isComplete) {
      alert('Please complete all required sections before submitting.')
      return
    }

    setIsSubmitting(true)
    try {
      // TODO: Implement actual submission to Supabase
      console.log('Submitting survey:', formData)
      await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulated delay
      alert('Survey submitted successfully!')
    } catch (error) {
      console.error('Submission error:', error)
      alert('Failed to submit survey. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-muted rounded-xl">
        <FileCheck className="w-8 h-8 text-muted-foreground" />
        <div>
          <h3 className="font-semibold text-lg">Review & Submit</h3>
          <p className="text-sm text-muted-foreground">
            Verify all information before submitting
          </p>
        </div>
      </div>

      {/* Completion Checklist */}
      <section>
        <h4 className="font-semibold mb-3">Completion Status</h4>
        <CompletionChecklist />
      </section>

      {/* Survey Summary */}
      <section>
        <h4 className="font-semibold mb-3">Survey Summary</h4>
        <SurveySummary />
      </section>

      {/* Additional Notes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="final-notes" className="text-base">
            Final Notes & Observations
          </Label>
          <VoiceNoteButton size="sm" />
        </div>
        <Textarea
          id="final-notes"
          value={formData.notes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateNotes(e.target.value)}
          placeholder="Any additional observations, recommendations, or notes for the proposal..."
          className="min-h-[120px] text-base"
        />
      </section>

      {/* Submit Button */}
      <div className="pt-4 border-t border-border">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!isComplete || isSubmitting}
          className="w-full min-h-[64px] text-lg touch-manipulation"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-6 h-6 mr-3 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-6 h-6 mr-3" />
              Submit Survey
            </>
          )}
        </Button>

        {!isComplete && (
          <p className="text-sm text-center text-yellow-600 mt-3">
            Complete all required sections to enable submission
          </p>
        )}
      </div>
    </div>
  )
}
