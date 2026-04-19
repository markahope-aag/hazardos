'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Cloud, CloudOff, Loader2, Save, WifiOff, X } from 'lucide-react'
import { SURVEY_SECTIONS, SECTION_LABELS, SurveySection } from '@/lib/stores/survey-types'
import { MobileWizardProgressDots } from './mobile-wizard-progress-dots'

interface Props {
  embedded: boolean
  currentSection: SurveySection
  sectionValidation: Record<SurveySection, { isValid: boolean; errors: string[] }>
  isOnline: boolean
  isSyncing: boolean
  isDirty: boolean
  lastSavedAt: string | null
  syncError: string | null
  onExit: () => void
  onSave: () => void
  onJumpToSection: (section: SurveySection) => void
}

/**
 * Sticky-top region of the mobile wizard: exit button, sync-state badge,
 * manual Save button, step dots, and the Step X of Y label.
 *
 * In embedded mode the sticky/safe-area behavior is disabled so the
 * parent page controls scrolling; in fullscreen PWA mode the header
 * pins to the top and respects the device safe-area.
 */
export function MobileWizardHeader({
  embedded,
  currentSection,
  sectionValidation,
  isOnline,
  isSyncing,
  isDirty,
  lastSavedAt,
  syncError,
  onExit,
  onSave,
  onJumpToSection,
}: Props) {
  const currentIndex = SURVEY_SECTIONS.indexOf(currentSection)

  return (
    <header
      className={cn(
        'bg-background border-b border-border',
        embedded ? 'rounded-t-lg' : 'sticky top-0 z-50',
      )}
      style={embedded ? undefined : { paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          className="touch-manipulation min-h-[44px]"
        >
          <X className="w-5 h-5 mr-1" />
          Exit
        </Button>

        <div className="flex items-center gap-2">
          {!isOnline && (
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md text-xs">
              <WifiOff className="w-3 h-3" />
              <span>Offline</span>
            </div>
          )}

          {isSyncing && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}

          {isDirty && !isSyncing && <span className="text-xs text-yellow-600">Unsaved</span>}

          {!isDirty && lastSavedAt && !isSyncing && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <Cloud className="w-3 h-3" />
              Saved
            </span>
          )}

          {syncError && <CloudOff className="w-4 h-4 text-destructive" />}

          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={isSyncing}
            className="touch-manipulation min-h-[44px]"
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
      </div>

      <MobileWizardProgressDots
        currentSection={currentSection}
        sectionValidation={sectionValidation}
        onSectionClick={onJumpToSection}
      />

      <div className="text-center pb-3">
        <p className="text-sm text-muted-foreground">
          Step {currentIndex + 1} of {SURVEY_SECTIONS.length}
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          {SECTION_LABELS[currentSection]}
        </h2>
      </div>
    </header>
  )
}
