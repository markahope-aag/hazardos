import { describe, expect, it, beforeEach, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { PWAInstallPrompt } from '@/components/pwa/pwa-install-prompt'

/**
 * The banner used to be a bare `beforeinstallprompt` listener, which Safari
 * never fires. Field crews on iPhones were told to install "when prompted"
 * and were never prompted. These cover the branches that decide whether the
 * banner appears at all.
 */

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

/** Drive the media queries the component asks about, one answer per query. */
function setEnvironment({
  standalone = false,
  coarsePointer = true,
  narrow = true,
  userAgent = ANDROID_UA,
  maxTouchPoints = 5,
}: {
  standalone?: boolean
  coarsePointer?: boolean
  narrow?: boolean
  userAgent?: string
  maxTouchPoints?: number
} = {}) {
  vi.mocked(window.matchMedia).mockImplementation(
    (query: string) =>
      ({
        matches:
          query.includes('display-mode: standalone')
            ? standalone
            : query.includes('pointer: coarse')
              ? coarsePointer
              : query.includes('max-width')
                ? narrow
                : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList,
  )
  Object.defineProperty(window.navigator, 'userAgent', { value: userAgent, configurable: true })
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    value: maxTouchPoints,
    configurable: true,
  })
}

/** Android/Chrome announcing that the app is installable. Wrapped in act
 *  because the listener sets state from outside React's event system. */
function fireInstallPromptEvent() {
  const event = new Event('beforeinstallprompt')
  Object.assign(event, { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted' }) })
  act(() => {
    window.dispatchEvent(event)
  })
}

describe('PWAInstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear()
    setEnvironment()
  })

  it('tells iPhone users how to install, since Safari never prompts', () => {
    setEnvironment({ userAgent: IPHONE_UA })

    render(<PWAInstallPrompt />)

    expect(screen.getByText(/Tap Share/i)).toBeInTheDocument()
    // No button: iOS gives the page no way to trigger the install itself.
    expect(screen.queryByRole('button', { name: /^install$/i })).not.toBeInTheDocument()
  })

  it('treats an iPad as iOS even though it reports itself as a Mac', () => {
    setEnvironment({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
      maxTouchPoints: 5,
    })

    render(<PWAInstallPrompt />)

    expect(screen.getByText(/Tap Share/i)).toBeInTheDocument()
  })

  it('shows an Install button on Android once the browser offers one', () => {
    render(<PWAInstallPrompt />)

    // Nothing before the browser says the app is installable.
    expect(screen.queryByText(/Install HazardOS/i)).not.toBeInTheDocument()

    fireInstallPromptEvent()

    expect(screen.getByRole('button', { name: /^install$/i })).toBeInTheDocument()
  })

  it('stays out of the way on a desktop, where installing gains nothing', () => {
    setEnvironment({ userAgent: DESKTOP_UA, coarsePointer: false, narrow: false, maxTouchPoints: 0 })

    render(<PWAInstallPrompt />)
    fireInstallPromptEvent()

    expect(screen.queryByText(/Install HazardOS/i)).not.toBeInTheDocument()
  })

  it('says nothing when it is already running from the home screen', () => {
    setEnvironment({ standalone: true, userAgent: IPHONE_UA })

    render(<PWAInstallPrompt />)

    expect(screen.queryByText(/Install HazardOS/i)).not.toBeInTheDocument()
  })

  it('honors a dismissal for seven days, then asks again', () => {
    setEnvironment({ userAgent: IPHONE_UA })

    localStorage.setItem('pwa-install-dismissed', String(Date.now() - 2 * 24 * 60 * 60 * 1000))
    const recent = render(<PWAInstallPrompt />)
    expect(screen.queryByText(/Install HazardOS/i)).not.toBeInTheDocument()
    recent.unmount()

    localStorage.setItem('pwa-install-dismissed', String(Date.now() - 8 * 24 * 60 * 60 * 1000))
    render(<PWAInstallPrompt />)
    expect(screen.getByText(/Install HazardOS/i)).toBeInTheDocument()
  })

  it('ignores a corrupt dismissal timestamp rather than hiding forever', () => {
    setEnvironment({ userAgent: IPHONE_UA })
    localStorage.setItem('pwa-install-dismissed', 'not-a-number')

    render(<PWAInstallPrompt />)

    expect(screen.getByText(/Install HazardOS/i)).toBeInTheDocument()
  })
})
