'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Loader2, Send } from 'lucide-react'
import { SurveySection } from '@/lib/stores/survey-types'

interface Props {
  embedded: boolean
  currentSection: SurveySection
  isFirstSection: boolean
  isReviewSection: boolean
  isSubmitting: boolean
  isOnline: boolean
  hasPhotosToUpload: boolean
  pendingPhotos: number
  failedPhotos: number
  submitError: string | null
  onBack: () => void
  onNext: () => void
  onSubmit: () => void
}

/**
 * Bottom navigation region: optional pending-uploads banner, optional
 * submit error banner, and the Back / Next-or-Submit buttons. Next is
 * disabled while photo uploads are in flight on the photos step —
 * advancing mid-upload could render the next section before photo state
 * settled.
 */
export function MobileWizardNavFooter({
  embedded,
  currentSection,
  isFirstSection,
  isReviewSection,
  isSubmitting,
  isOnline,
  hasPhotosToUpload,
  pendingPhotos,
  failedPhotos,
  submitError,
  onBack,
  onNext,
  onSubmit,
}: Props) {
  return (
    <footer
      // The `safe-area-bottom` class that shipped here was never defined
      // in CSS, so on iOS the Back/Next/Save buttons sat directly under
      // the home indicator and couldn't be tapped reliably. Using an
      // explicit env(safe-area-inset-bottom) fallback instead.
      className={cn(
        'bg-background border-t border-border',
        embedded
          ? 'sticky bottom-0 rounded-b-lg z-10'
          : 'fixed bottom-0 left-0 right-0 z-40',
      )}
      style={
        embedded ? undefined : { paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }
      }
    >
      {hasPhotosToUpload && isOnline && (
        <div className="px-4 py-2 bg-blue-50 text-blue-700 text-sm text-center border-b border-blue-100">
          {pendingPhotos > 0 && (
            <span>
              {pendingPhotos} photo{pendingPhotos !== 1 ? 's' : ''} uploading...
            </span>
          )}
          {failedPhotos > 0 && (
            <span className="text-destructive ml-2">{failedPhotos} failed</span>
          )}
        </div>
      )}

      {submitError && (
        <div className="px-4 py-2 bg-destructive/5 text-destructive text-sm text-center border-b border-destructive/10">
          {submitError}
        </div>
      )}

      <div className="flex items-center justify-between p-4 gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={onBack}
          disabled={isFirstSection || isSubmitting}
          className={cn(
            'flex-1 min-h-[52px] touch-manipulation',
            isFirstSection && 'invisible',
          )}
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back
        </Button>

        {isReviewSection ? (
          <Button
            size="lg"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="flex-1 min-h-[52px] touch-manipulation bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {hasPhotosToUpload ? 'Uploading...' : 'Submitting...'}
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Submit
              </>
            )}
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={onNext}
            disabled={
              isSubmitting ||
              (currentSection === 'photos' && pendingPhotos > 0)
            }
            className="flex-1 min-h-[52px] touch-manipulation"
          >
            {currentSection === 'photos' && pendingPhotos > 0 ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Uploading ({pendingPhotos})
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-5 h-5 ml-1" />
              </>
            )}
          </Button>
        )}
      </div>
    </footer>
  )
}
