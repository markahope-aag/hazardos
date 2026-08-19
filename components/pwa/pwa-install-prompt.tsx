'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Share, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pwa-install-dismissed'
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Offers to install HazardOS to the home screen.
 *
 * Two things this has to handle that a `beforeinstallprompt` listener alone
 * does not:
 *
 *  1. Safari never fires `beforeinstallprompt`, so on iPhone and iPad the
 *     banner used to be dead code. Field crews on iPhones were told by the
 *     manual to install "when prompted" and were never prompted. iOS gets
 *     the Share > Add to Home Screen instructions instead, since that is
 *     the only route Apple offers.
 *  2. It is mounted in the dashboard layout, so it would otherwise nag
 *     office staff on desktops who have nothing to gain from installing.
 *     Coarse pointer plus a narrow viewport keeps it on phones and tablets.
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    // Already running from the home screen: nothing to offer.
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    if (isStandalone) return

    // Phones and tablets only. Installing does nothing useful for someone
    // working at a desk, and the offline survey tool is the reason to do it.
    const isHandheld =
      window.matchMedia('(pointer: coarse)').matches &&
      window.matchMedia('(max-width: 1024px)').matches
    if (!isHandheld) return

    const previouslyDismissed = localStorage.getItem(DISMISSED_KEY)
    if (previouslyDismissed) {
      const dismissedAt = Number.parseInt(previouslyDismissed, 10)
      if (Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_FOR_MS) return
    }

    setDismissed(false)

    // iPadOS reports itself as a Mac, so the touch-point count is what
    // separates an iPad from a desktop Safari.
    const ua = window.navigator.userAgent
    const isIOS =
      /iphone|ipad|ipod/i.test(ua) ||
      (/macintosh/i.test(ua) && window.navigator.maxTouchPoints > 1)

    if (isIOS) {
      setShowIosHint(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = useCallback(() => {
    setDismissed(true)
    localStorage.setItem(DISMISSED_KEY, Date.now().toString())
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    // The event is single-use either way. Clearing it on 'dismissed' too
    // stops the banner sitting there offering a button that can no longer
    // do anything.
    setDeferredPrompt(null)
    if (outcome === 'dismissed') dismiss()
  }, [deferredPrompt, dismiss])

  if (dismissed) return null
  if (!deferredPrompt && !showIosHint) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 flex items-center gap-3">
        <div className="flex-shrink-0 p-2 bg-orange-100 rounded-lg">
          {showIosHint ? (
            <Share className="w-5 h-5 text-orange-600" />
          ) : (
            <Download className="w-5 h-5 text-orange-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">Install HazardOS</p>
          <p className="text-xs text-gray-500">
            {showIosHint
              ? 'Tap Share, then "Add to Home Screen", to work offline on site.'
              : 'Add to home screen for offline access'}
          </p>
        </div>
        {!showIosHint && (
          <Button size="sm" onClick={handleInstall} className="flex-shrink-0 min-h-[36px]">
            Install
          </Button>
        )}
        <button
          onClick={dismiss}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
