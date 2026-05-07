'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Props {
  open: boolean
  isDirty: boolean
  onOpenChange: (open: boolean) => void
  onContinueEditing: () => void
  onDiscard: () => void
  onSaveAndExit: () => void
}

/**
 * Exit dialog. Always offered when the user taps Exit so Discard is reachable
 * even from a clean (auto-saved) state — otherwise a saved-but-unwanted draft
 * persists in localStorage and silently rehydrates next time.
 */
export function MobileWizardExitDialog({
  open,
  isDirty,
  onOpenChange,
  onContinueEditing,
  onDiscard,
  onSaveAndExit,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isDirty ? 'Unsaved Changes' : 'Exit Survey'}</AlertDialogTitle>
          <AlertDialogDescription>
            {isDirty
              ? 'You have unsaved changes. Would you like to save before exiting?'
              : 'Save the draft to keep working on it later, or discard it to start fresh next time.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onContinueEditing}>Continue Editing</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDiscard}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDirty ? 'Discard Changes' : 'Discard Draft'}
          </AlertDialogAction>
          <AlertDialogAction onClick={onSaveAndExit}>Save &amp; Exit</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
