'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Props {
  open: boolean
  isResolving: boolean
  onUseLatest: () => void
  onKeepMine: () => void
}

/**
 * Sync-conflict dialog (X12). Shown when a draft save or submit is rejected
 * because the same survey was changed on another device since this one loaded
 * it. Rather than silently overwriting, the surveyor picks which version wins.
 *
 * There is intentionally no cancel/dismiss: leaving the conflict unresolved
 * would let the next auto-save hit the same wall repeatedly. Both actions
 * resolve it — one keeps the server copy, one keeps this device's edits.
 */
export function MobileWizardConflictDialog({
  open,
  isResolving,
  onUseLatest,
  onKeepMine,
}: Props) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Survey changed on another device</AlertDialogTitle>
          <AlertDialogDescription>
            This survey was edited somewhere else while you were working offline.
            Saving now would overwrite those changes. Choose which version to keep
            — the other device&apos;s saved copy, or the edits on this device.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={onUseLatest}
            disabled={isResolving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Discard mine, load latest
          </AlertDialogAction>
          <AlertDialogAction onClick={onKeepMine} disabled={isResolving}>
            Keep my version
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
