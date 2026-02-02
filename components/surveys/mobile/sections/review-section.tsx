'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { usePhotoQueueStore } from '@/lib/stores/photo-queue-store'
import { useOnlineStatus } from '@/lib/hooks/use-online-status'
import {
  processPhotoQueue,
  waitForUploads,
} from '@/lib/services/photo-upload-service'
import { CompletionChecklist, SurveySummary } from '../review'
import { UploadStatus } from '../photos'
import { VoiceNoteButton } from '../inputs'
import { FileCheck, Send, Loader2, WifiOff, CloudUpload } from 'lucide-react'

export function ReviewSection() {
  const router = useRouter()
  const isOnline = useOnlineStatus()

  const {
    formData,
    updateNotes,
    validateAll,
    submitSurvey,
    saveDraft,
    currentSurveyId,
    isSyncing,
    syncError,
  } = useSurveyStore()

  const { clearSurveyPhotos, getPendingCount, getFailedCount } = usePhotoQueueStore()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isComplete = validateAll()
  const pendingPhotos = currentSurveyId ? getPendingCount(currentSurveyId) : 0
  const failedPhotos = currentSurveyId ? getFailedCount(currentSurveyId) : 0
  const hasPhotosToUpload = pendingPhotos > 0 || failedPhotos > 0

  const handleSubmit = async () => {
    if (!isComplete) {
      setSubmitError('Please complete all required sections before submitting.')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // If offline, save locally for later sync
      if (!isOnline) {
        await saveDraft()
        alert(
          'Survey saved locally. It will be submitted automatically when you\'re back online.'
        )
        setIsSubmitting(false)
        return
      }

      // Process any pending photo uploads first
      if (currentSurveyId && hasPhotosToUpload) {
        // Start processing queue
        processPhotoQueue()

        // Wait for uploads to complete (with timeout)
        const uploadSuccess = await waitForUploads(currentSurveyId, 120000) // 2 minute timeout

        if (!uploadSuccess) {
          const failed = getFailedCount(currentSurveyId)
          if (failed > 0) {
            setSubmitError(
              `${failed} photo(s) failed to upload. Please retry or remove failed photos before submitting.`
            )
            setIsSubmitting(false)
            return
          }
        }
      }

      // Submit the survey to database
      const success = await submitSurvey()

      if (success) {
        // Clear local photo queue for this survey
        if (currentSurveyId) {
          clearSurveyPhotos(currentSurveyId)
        }

        // Navigate to success page or survey list
        router.push('/site-surveys?submitted=true')
      } else {
        setSubmitError(syncError || 'Failed to submit survey. Please try again.')
      }
    } catch (error) {
      console.error('Submission error:', error)
      setSubmitError(
        error instanceof Error ? error.message : 'Failed to submit survey. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveOffline = async () => {
    setSubmitError(null)
    const success = await saveDraft()
    if (success) {
      alert('Survey saved locally. You can submit when back online.')
    } else {
      setSubmitError('Failed to save survey locally.')
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

      {/* Offline Warning */}
      {!isOnline && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <WifiOff className="w-6 h-6 text-yellow-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-800">You're offline</p>
            <p className="text-sm text-yellow-700">
              Your survey will be saved locally and submitted when you're back online.
            </p>
          </div>
        </div>
      )}

      {/* Photo Upload Status */}
      {currentSurveyId && (
        <UploadStatus surveyId={currentSurveyId} />
      )}

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
          <VoiceNoteButton />
        </div>
        <Textarea
          id="final-notes"
          value={formData.notes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateNotes(e.target.value)}
          placeholder="Any additional observations, recommendations, or notes for the proposal..."
          className="min-h-[120px] text-base"
        />
      </section>

      {/* Error Message */}
      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <p className="text-sm">{submitError}</p>
        </div>
      )}

      {/* Submit Section */}
      <div className="pt-4 border-t border-border space-y-3">
        {/* Main Submit Button */}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!isComplete || isSubmitting || isSyncing}
          className="w-full min-h-[64px] text-lg touch-manipulation"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-6 h-6 mr-3 animate-spin" />
              {hasPhotosToUpload ? 'Uploading Photos...' : 'Submitting...'}
            </>
          ) : !isOnline ? (
            <>
              <CloudUpload className="w-6 h-6 mr-3" />
              Save for Later
            </>
          ) : (
            <>
              <Send className="w-6 h-6 mr-3" />
              Submit Survey
            </>
          )}
        </Button>

        {/* Offline save button (secondary) */}
        {isOnline && (
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveOffline}
            disabled={isSubmitting || isSyncing}
            className="w-full min-h-[52px] touch-manipulation"
          >
            <CloudUpload className="w-5 h-5 mr-2" />
            Save Draft
          </Button>
        )}

        {/* Validation Warning */}
        {!isComplete && (
          <p className="text-sm text-center text-yellow-600">
            Complete all required sections to enable submission
          </p>
        )}

        {/* Photos pending warning */}
        {isComplete && hasPhotosToUpload && isOnline && (
          <p className="text-sm text-center text-blue-600">
            {pendingPhotos} photo{pendingPhotos !== 1 ? 's' : ''} will be uploaded when you submit
          </p>
        )}
      </div>
    </div>
  )
}
