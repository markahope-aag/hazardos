'use client'

import { useEffect, useCallback, useRef, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { usePhotoQueueStore } from '@/lib/stores/photo-queue-store'
import { useOnlineStatus, useOnlineSync } from '@/lib/hooks/use-online-status'
import { SurveySection, SURVEY_SECTIONS } from '@/lib/stores/survey-types'
import { processPhotoQueue, waitForUploads } from '@/lib/services/photo-upload-service'
import { FormErrorBoundary, ErrorBoundary } from '@/components/error-boundaries'
import { logger, formatError } from '@/lib/utils/logger'
import { Loader2 } from 'lucide-react'

import { MobileWizardHeader } from './mobile-wizard-header'
import { MobileWizardNavFooter } from './mobile-wizard-nav-footer'
import { MobileWizardExitDialog } from './mobile-wizard-exit-dialog'

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
  /**
   * When true, render inside a parent page layout instead of as a fullscreen
   * app. Drops `min-h-screen`, un-sticks the header, and pins the footer
   * within the local container instead of the viewport. Use this on desktop
   * dashboard pages; leave false for the /site-surveys/mobile PWA entry.
   */
  embedded?: boolean
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
  embedded = false,
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
  const wizardRootRef = useRef<HTMLDivElement>(null)

  // Current section index
  const currentIndex = SURVEY_SECTIONS.indexOf(currentSection)
  const isFirstSection = currentIndex === 0
  const isLastSection = currentIndex === SURVEY_SECTIONS.length - 1
  const isReviewSection = currentSection === 'review'

  // Photo upload status
  const pendingPhotos = currentSurveyId ? getPendingCount(currentSurveyId) : 0
  const failedPhotos = currentSurveyId ? getFailedCount(currentSurveyId) : 0
  const hasPhotosToUpload = pendingPhotos > 0 || failedPhotos > 0

  // Initialize survey on mount (runs once)
  const initializedRef = useRef(false)
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const initializeSurvey = async () => {
      try {
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
            logger.error({ surveyId }, 'Failed to load survey')
          }
        } else if (!currentSurveyId && organizationId) {
          // Create new survey in database
          await createSurveyInDb()
        }
      } catch (err) {
        // Fail-open: a thrown init (bad network, rejected RLS, etc.) used
        // to leave isInitialized=false forever, which presented as a blank
        // white screen / frozen tab. Now we surface the error in the UI
        // and still let the user interact — they can retry via save/exit.
        logger.error(
          { err: err instanceof Error ? err.message : String(err) },
          'Mobile survey initialization failed',
        )
      } finally {
        setIsInitialized(true)
      }
    }

    initializeSurvey()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Propagate orgId/customerId when they arrive after initial mount.
  // `useMultiTenantAuth` resolves asynchronously; if the wizard renders
  // before organization loads, the initial init above runs with
  // organizationId=undefined and photos captured afterward fail to
  // upload because the storage RLS policy keys on the first folder
  // segment being the org id.
  useEffect(() => {
    if (organizationId) setOrganizationId(organizationId)
  }, [organizationId, setOrganizationId])
  useEffect(() => {
    if (customerId) setCustomerId(customerId)
  }, [customerId, setCustomerId])

  // Scroll reset when the section changes. In embedded mode the outer
  // page is the scroll container (main has no overflow-y), so scrolling
  // mainContentRef does nothing — we have to scroll the wizard root
  // into view. In fullscreen mode main IS the scroll container, so we
  // still scroll it to top for snappiness.
  useEffect(() => {
    if (!isInitialized) return
    if (embedded) {
      wizardRootRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    } else {
      mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentSection, embedded, isInitialized])

  // Auto-save effect — read from store directly to avoid dep re-renders
  useEffect(() => {
    if (!isInitialized) return

    autoSaveTimerRef.current = setInterval(async () => {
      const state = useSurveyStore.getState()
      if (state.isDirty) {
        await state.saveDraft()
      }
    }, AUTO_SAVE_INTERVAL_MS)

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, [isInitialized])

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        // Legacy browsers (Firefox, older Chrome) require this assignment
        // to actually display the confirmation dialog.
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // Rehydrate wizard state when the tab becomes visible again. On mobile
  // the browser freezes background tabs aggressively — returning from
  // another app can leave the React tree out of sync with what Zustand
  // has in localStorage. Pushing the persisted state back onto the store
  // avoids the blank-screen-on-return behavior.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      try {
        const raw = localStorage.getItem('hazardos-survey-draft')
        if (!raw) return
        const parsed = JSON.parse(raw)
        const persisted = parsed?.state
        if (persisted && typeof persisted === 'object') {
          // Only merge fields the persist config writes back — avoids
          // clobbering transient UI state like validation caches.
          useSurveyStore.setState((current) => ({
            ...current,
            currentSection: persisted.currentSection ?? current.currentSection,
            currentSurveyId: persisted.currentSurveyId ?? current.currentSurveyId,
            customerId: persisted.customerId ?? current.customerId,
            organizationId: persisted.organizationId ?? current.organizationId,
            formData: persisted.formData ?? current.formData,
            lastSavedAt: persisted.lastSavedAt ?? current.lastSavedAt,
          }))
        }
      } catch (err) {
        logger.error(
          { err: err instanceof Error ? err.message : String(err) },
          'visibility-change rehydrate failed',
        )
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  // Process photo queue when coming online
  useEffect(() => {
    if (isOnline && currentSurveyId) {
      processPhotoQueue()
    }
  }, [isOnline, currentSurveyId])

  // Navigation handlers — the scroll-to-top is handled by the effect on
  // currentSection above, so these just update the step.
  const handleBack = useCallback(() => {
    if (!isFirstSection) {
      validateSection(currentSection)
      setCurrentSection(SURVEY_SECTIONS[currentIndex - 1])
    }
  }, [isFirstSection, currentSection, currentIndex, validateSection, setCurrentSection])

  const handleNext = useCallback(() => {
    const validation = validateSection(currentSection)
    if (!validation.isValid && currentSection !== 'review') {
      logger.debug(
        {
          section: currentSection,
          validationErrors: validation.errors,
        },
        'Section validation issues',
      )
    }
    if (!isLastSection) {
      setCurrentSection(SURVEY_SECTIONS[currentIndex + 1])
    }
  }, [currentSection, currentIndex, isLastSection, validateSection, setCurrentSection])

  const handleJumpToSection = useCallback(
    (section: SurveySection) => {
      setCurrentSection(section)
    },
    [setCurrentSection],
  )

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
      <div
        ref={wizardRootRef}
        className={cn(
          'flex flex-col bg-background',
          embedded ? 'min-h-[70vh] rounded-lg border' : 'min-h-screen',
          className,
        )}
      >
        <MobileWizardHeader
          embedded={embedded}
          currentSection={currentSection}
          sectionValidation={sectionValidation}
          isOnline={isOnline}
          isSyncing={isSyncing}
          isDirty={isDirty}
          lastSavedAt={lastSavedAt}
          syncError={syncError}
          onExit={handleExitRequest}
          onSave={handleManualSave}
          onJumpToSection={handleJumpToSection}
        />

        {/* Main content area with swipe support */}
        <main
          ref={mainContentRef}
          className={cn('flex-1', embedded ? '' : 'overflow-y-auto pb-28')}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="px-4 py-6">
            <SectionErrorBoundary sectionName={currentSection}>
              <CurrentSectionComponent />
            </SectionErrorBoundary>
          </div>
        </main>

        <MobileWizardNavFooter
          embedded={embedded}
          currentSection={currentSection}
          isFirstSection={isFirstSection}
          isReviewSection={isReviewSection}
          isSubmitting={isSubmitting}
          isOnline={isOnline}
          hasPhotosToUpload={hasPhotosToUpload}
          pendingPhotos={pendingPhotos}
          failedPhotos={failedPhotos}
          submitError={submitError}
          onBack={handleBack}
          onNext={handleNext}
          onSubmit={handleSubmit}
        />

        <MobileWizardExitDialog
          open={showExitConfirm}
          onOpenChange={setShowExitConfirm}
          onContinueEditing={() => setShowExitConfirm(false)}
          onDiscard={() => {
            resetSurvey()
            if (onExit) {
              onExit()
            } else {
              router.push('/site-surveys')
            }
          }}
          onSaveAndExit={handleSaveAndExit}
        />
      </div>
    </MobileSurveyWizardErrorBoundary>
  )
}

