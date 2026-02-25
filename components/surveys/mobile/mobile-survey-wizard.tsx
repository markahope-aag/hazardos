'use client'

import { useEffect, useCallback, useRef, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { usePhotoQueueStore } from '@/lib/stores/photo-queue-store'
import { useOnlineStatus, useOnlineSync } from '@/lib/hooks/use-online-status'
import { SurveySection, SURVEY_SECTIONS, SECTION_LABELS } from '@/lib/stores/survey-types'
import { processPhotoQueue, waitForUploads } from '@/lib/services/photo-upload-service'
import { FormErrorBoundary, ErrorBoundary } from '@/components/error-boundaries'
import { logger, formatError } from '@/lib/utils/logger'
import {
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Send,
  WifiOff,
  Cloud,
  CloudOff,
  Loader2,
  AlertTriangle,
} from 'lucide-react'

// Section components
import { PropertySection } from './sections/property-section'
import { AccessSection } from './sections/access-section'
import { EnvironmentSection } from './sections/environment-section'
import { HazardsSection } from './sections/hazards-section'
import { PhotosSection } from './sections/photos-section'
import { ReviewSection } from './sections/review-section'

// Constants
const AUTO_SAVE_INTERVAL_MS = 30000 // 30 seconds
const SWIPE_THRESHOLD = 50 // pixels

interface MobileSurveyWizardProps {
  surveyId?: string
  customerId?: string
  organizationId?: string
  className?: string
  onComplete?: (data: {
    id: string
    customer_id: string
    survey_data: Record<string, unknown>
  }) => void
  onExit?: () => void
}

/**
 * Error boundary wrapper for the Mobile Survey Wizard
 */
export function MobileSurveyWizardErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <FormErrorBoundary
      formName="Mobile Site Survey"
      backPath="/site-surveys"
      backLabel="Back to Surveys"
    >
      {children}
    </FormErrorBoundary>
  )
}

/**
 * Error boundary for individual wizard sections
 */
function SectionErrorBoundary({
  children,
  sectionName,
}: {
  children: ReactNode
  sectionName: string
}) {
  return (
    <ErrorBoundary
      name={`MobileSurveySection:${sectionName}`}
      minHeight="200px"
      showDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ErrorBoundary>
  )
}

// Section components mapping
const sectionComponents: Record<SurveySection, React.ComponentType> = {
  property: PropertySection,
  access: AccessSection,
  environment: EnvironmentSection,
  hazards: HazardsSection,
  photos: PhotosSection,
  review: ReviewSection,
}

/**
 * Mobile-optimized Survey Wizard Component
 *
 * Features:
 * - Multi-step form with swipe navigation
 * - Offline data persistence with auto-save
 * - Photo capture and background upload queue
 * - Real-time validation feedback
 * - Mobile-first touch-optimized UI
 */
export default function MobileSurveyWizard({
  surveyId,
  customerId,
  organizationId,
  className,
  onComplete,
  onExit,
}: MobileSurveyWizardProps) {
  const router = useRouter()
  const isOnline = useOnlineStatus()
  const { syncNow, isSyncing } = useOnlineSync()

  // Survey store
  const {
    currentSection,
    setCurrentSection,
    currentSurveyId,
    setCurrentSurveyId,
    setCustomerId,
    setOrganizationId,
    isDirty,
    lastSavedAt,
    saveDraft,
    submitSurvey,
    loadSurveyFromDb,
    createSurveyInDb,
    validateSection,
    validateAll,
    sectionValidation,
    syncError,
    resetSurvey,
    formData,
  } = useSurveyStore()

  // Photo queue store
  const {
    getPendingCount,
    getFailedCount,
    clearSurveyPhotos,
  } = usePhotoQueueStore()

  // Local state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Refs for auto-save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)

  // Current section index
  const currentIndex = SURVEY_SECTIONS.indexOf(currentSection)
  const isFirstSection = currentIndex === 0
  const isLastSection = currentIndex === SURVEY_SECTIONS.length - 1
  const isReviewSection = currentSection === 'review'

  // Photo upload status
  const pendingPhotos = currentSurveyId ? getPendingCount(currentSurveyId) : 0
  const failedPhotos = currentSurveyId ? getFailedCount(currentSurveyId) : 0
  const hasPhotosToUpload = pendingPhotos > 0 || failedPhotos > 0

  // Initialize survey on mount
  useEffect(() => {
    const initializeSurvey = async () => {
      // Set organization and customer IDs
      if (organizationId) {
        setOrganizationId(organizationId)
      }
      if (customerId) {
        setCustomerId(customerId)
      }

      // Load existing survey or create new one
      if (surveyId) {
        setCurrentSurveyId(surveyId)
        const loaded = await loadSurveyFromDb(surveyId)
        if (!loaded) {
          logger.error(
            { surveyId },
            'Failed to load survey'
          )
        }
      } else if (!currentSurveyId && organizationId) {
        // Create new survey in database
        await createSurveyInDb()
      }

      setIsInitialized(true)
    }

    initializeSurvey()
  }, [
    surveyId,
    customerId,
    organizationId,
    currentSurveyId,
    setCurrentSurveyId,
    setCustomerId,
    setOrganizationId,
    loadSurveyFromDb,
    createSurveyInDb,
  ])

  // Auto-save effect
  useEffect(() => {
    if (!isInitialized) return

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current)
    }

    // Set up auto-save interval
    autoSaveTimerRef.current = setInterval(async () => {
      if (isDirty) {
        await saveDraft()
      }
    }, AUTO_SAVE_INTERVAL_MS)

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, [isDirty, saveDraft, isInitialized])

  // Process photo queue when coming online
  useEffect(() => {
    if (isOnline && currentSurveyId) {
      processPhotoQueue()
    }
  }, [isOnline, currentSurveyId])

  // Navigation handlers
  const handleBack = useCallback(() => {
    if (!isFirstSection) {
      // Validate current section (non-blocking)
      validateSection(currentSection)
      setCurrentSection(SURVEY_SECTIONS[currentIndex - 1])
      // Scroll to top of main content
      mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [isFirstSection, currentSection, currentIndex, validateSection, setCurrentSection])

  const handleNext = useCallback(() => {
    // Validate current section
    const validation = validateSection(currentSection)

    // Show validation errors but still allow navigation (soft validation)
    if (!validation.isValid && currentSection !== 'review') {
      // User can still proceed, but they'll see the warning
      logger.debug(
        { 
          section: currentSection,
          validationErrors: validation.errors
        },
        'Section validation issues'
      )
    }

    if (!isLastSection) {
      setCurrentSection(SURVEY_SECTIONS[currentIndex + 1])
      // Scroll to top of main content
      mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentSection, currentIndex, isLastSection, validateSection, setCurrentSection])

  // Jump to specific section (if not blocked)
  const handleJumpToSection = useCallback((section: SurveySection) => {
    setCurrentSection(section)
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [setCurrentSection])

  // Swipe gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX === null) return

    const touchEndX = e.changedTouches[0].clientX
    const deltaX = touchEndX - touchStartX

    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX > 0 && !isFirstSection) {
        // Swipe right - go back
        handleBack()
      } else if (deltaX < 0 && !isLastSection) {
        // Swipe left - go forward
        handleNext()
      }
    }

    setTouchStartX(null)
  }, [touchStartX, isFirstSection, isLastSection, handleBack, handleNext])

  // Save and exit
  const handleSaveAndExit = useCallback(async () => {
    if (isDirty) {
      await saveDraft()
    }

    if (onExit) {
      onExit()
    } else {
      router.push('/site-surveys')
    }
  }, [isDirty, saveDraft, onExit, router])

  // Exit with confirmation if dirty
  const handleExitRequest = useCallback(() => {
    if (isDirty) {
      setShowExitConfirm(true)
    } else {
      handleSaveAndExit()
    }
  }, [isDirty, handleSaveAndExit])

  // Manual save
  const handleManualSave = useCallback(async () => {
    await saveDraft()
    if (isOnline) {
      await syncNow()
    }
  }, [saveDraft, syncNow, isOnline])

  // Submit survey
  const handleSubmit = useCallback(async () => {
    const isComplete = validateAll()

    if (!isComplete) {
      setSubmitError('Please complete all required sections before submitting.')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // If offline, save locally
      if (!isOnline) {
        await saveDraft()
        setSubmitError('Survey saved locally. It will be submitted when you are back online.')
        setIsSubmitting(false)
        return
      }

      // Process pending photo uploads first
      if (currentSurveyId && hasPhotosToUpload) {
        processPhotoQueue()
        const uploadSuccess = await waitForUploads(currentSurveyId, 120000)

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

      // Submit survey
      const success = await submitSurvey()

      if (success) {
        // Clear local photo queue
        if (currentSurveyId) {
          clearSurveyPhotos(currentSurveyId)
        }

        // Call completion callback if provided
        if (onComplete && currentSurveyId) {
          onComplete({
            id: currentSurveyId,
            customer_id: customerId || '',
            survey_data: formData as unknown as Record<string, unknown>,
          })
        }

        // Reset survey state
        resetSurvey()

        // Navigate to success
        router.push('/site-surveys?submitted=true')
      } else {
        setSubmitError(syncError || 'Failed to submit survey. Please try again.')
      }
    } catch (error) {
      logger.error(
        { 
          error: formatError(error, 'MOBILE_SURVEY_SUBMISSION_ERROR'),
          surveyId: currentSurveyId
        },
        'Submission error'
      )
      setSubmitError(
        error instanceof Error ? error.message : 'Failed to submit survey. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [
    validateAll,
    isOnline,
    saveDraft,
    currentSurveyId,
    hasPhotosToUpload,
    getFailedCount,
    submitSurvey,
    clearSurveyPhotos,
    onComplete,
    customerId,
    formData,
    resetSurvey,
    router,
    syncError,
  ])

  // Get current section component
  const CurrentSectionComponent = sectionComponents[currentSection]

  // Loading state
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading survey...</p>
        </div>
      </div>
    )
  }

  return (
    <MobileSurveyWizardErrorBoundary>
      <div className={cn('flex flex-col min-h-screen bg-background', className)}>
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background border-b border-border safe-area-top">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Exit Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExitRequest}
              className="touch-manipulation min-h-[44px]"
            >
              <X className="w-5 h-5 mr-1" />
              Exit
            </Button>

            {/* Sync Status */}
            <div className="flex items-center gap-2">
              {/* Online/Offline indicator */}
              {!isOnline && (
                <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md text-xs">
                  <WifiOff className="w-3 h-3" />
                  <span>Offline</span>
                </div>
              )}

              {/* Sync status */}
              {isSyncing && (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              )}

              {isDirty && !isSyncing && (
                <span className="text-xs text-yellow-600">Unsaved</span>
              )}

              {!isDirty && lastSavedAt && !isSyncing && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  Saved
                </span>
              )}

              {syncError && (
                <CloudOff className="w-4 h-4 text-destructive" />
              )}

              {/* Save Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSave}
                disabled={isSyncing}
                className="touch-manipulation min-h-[44px]"
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          </div>

          {/* Progress Navigation */}
          <ProgressNavigation
            currentSection={currentSection}
            sectionValidation={sectionValidation}
            onSectionClick={handleJumpToSection}
          />

          {/* Section Label */}
          <div className="text-center pb-3">
            <p className="text-sm text-muted-foreground">
              Step {currentIndex + 1} of {SURVEY_SECTIONS.length}
            </p>
            <h2 className="text-lg font-semibold text-foreground">
              {SECTION_LABELS[currentSection]}
            </h2>
          </div>
        </header>

        {/* Main Content Area with swipe support */}
        <main
          ref={mainContentRef}
          className="flex-1 overflow-y-auto pb-28"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="px-4 py-6">
            <SectionErrorBoundary sectionName={currentSection}>
              <CurrentSectionComponent />
            </SectionErrorBoundary>
          </div>
        </main>

        {/* Footer Navigation */}
        <footer className="fixed bottom-0 left-0 right-0 bg-background border-t border-border safe-area-bottom z-40">
          {/* Pending uploads indicator */}
          {hasPhotosToUpload && isOnline && (
            <div className="px-4 py-2 bg-blue-50 text-blue-700 text-sm text-center border-b border-blue-100">
              {pendingPhotos > 0 && (
                <span>{pendingPhotos} photo{pendingPhotos !== 1 ? 's' : ''} uploading...</span>
              )}
              {failedPhotos > 0 && (
                <span className="text-destructive ml-2">
                  {failedPhotos} failed
                </span>
              )}
            </div>
          )}

          {/* Submit error */}
          {submitError && (
            <div className="px-4 py-2 bg-destructive/5 text-destructive text-sm text-center border-b border-destructive/10">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-between p-4 gap-3">
            {/* Back Button */}
            <Button
              variant="outline"
              size="lg"
              onClick={handleBack}
              disabled={isFirstSection || isSubmitting}
              className={cn(
                'flex-1 min-h-[52px] touch-manipulation',
                isFirstSection && 'invisible'
              )}
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back
            </Button>

            {/* Next/Submit Button */}
            {isReviewSection ? (
              <Button
                size="lg"
                onClick={handleSubmit}
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
                onClick={handleNext}
                disabled={isSubmitting}
                className="flex-1 min-h-[52px] touch-manipulation"
              >
                Next
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            )}
          </div>
        </footer>

        {/* Exit Confirmation Dialog */}
        {showExitConfirm && (
          <ExitConfirmDialog
            onConfirm={handleSaveAndExit}
            onCancel={() => setShowExitConfirm(false)}
            onDiscard={() => {
              resetSurvey()
              if (onExit) {
                onExit()
              } else {
                router.push('/site-surveys')
              }
            }}
          />
        )}
      </div>
    </MobileSurveyWizardErrorBoundary>
  )
}

/**
 * Progress Navigation Component
 * Shows dot indicators for each section with completion status
 */
interface ProgressNavigationProps {
  currentSection: SurveySection
  sectionValidation: Record<SurveySection, { isValid: boolean; errors: string[] }>
  onSectionClick: (section: SurveySection) => void
}

function ProgressNavigation({
  currentSection,
  sectionValidation,
  onSectionClick,
}: ProgressNavigationProps) {
  const currentIndex = SURVEY_SECTIONS.indexOf(currentSection)

  return (
    <div className="flex items-center justify-center gap-2 py-3 px-4">
      {SURVEY_SECTIONS.map((section, index) => {
        const isCurrent = section === currentSection
        const isCompleted = sectionValidation[section]?.isValid
        const isPast = index < currentIndex

        return (
          <button
            key={section}
            onClick={() => onSectionClick(section)}
            className={cn(
              'relative flex items-center justify-center touch-manipulation transition-all duration-200',
              'min-w-[40px] min-h-[40px] rounded-full',
              isCurrent && 'ring-2 ring-primary ring-offset-2'
            )}
            aria-label={`Go to ${SECTION_LABELS[section]} section${isCompleted ? ' (completed)' : ''}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span
              className={cn(
                'flex items-center justify-center w-3 h-3 rounded-full transition-all duration-200',
                isCurrent && 'w-4 h-4 bg-primary',
                isCompleted && !isCurrent && 'w-4 h-4 bg-green-500',
                !isCurrent && !isCompleted && isPast && 'bg-gray-400',
                !isCurrent && !isCompleted && !isPast && 'bg-gray-300'
              )}
            >
              {isCompleted && !isCurrent && (
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Exit Confirmation Dialog
 * Shows when user tries to exit with unsaved changes
 */
interface ExitConfirmDialogProps {
  onConfirm: () => void
  onCancel: () => void
  onDiscard: () => void
}

function ExitConfirmDialog({ onConfirm, onCancel, onDiscard }: ExitConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 safe-area-inset">
      <div className="bg-background rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-yellow-100 rounded-full">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold">Unsaved Changes</h3>
        </div>

        <p className="text-muted-foreground mb-6">
          You have unsaved changes. Would you like to save before exiting?
        </p>

        <div className="space-y-2">
          <Button
            onClick={onConfirm}
            className="w-full min-h-[48px] touch-manipulation"
          >
            Save & Exit
          </Button>

          <Button
            variant="outline"
            onClick={onDiscard}
            className="w-full min-h-[48px] touch-manipulation text-destructive hover:text-destructive/90 hover:bg-destructive/5"
          >
            Discard Changes
          </Button>

          <Button
            variant="ghost"
            onClick={onCancel}
            className="w-full min-h-[48px] touch-manipulation"
          >
            Continue Editing
          </Button>
        </div>
      </div>
    </div>
  )
}
