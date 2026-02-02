import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay - capture 10% of sessions, 100% on error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Environment
  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask all text content for privacy
      maskAllText: true,
      // Block all media for privacy
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Filter out noisy errors
  ignoreErrors: [
    // Browser extensions
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    // Common network errors
    'Network request failed',
    'Failed to fetch',
    'NetworkError',
    'Load failed',
    // User-initiated navigation
    'AbortError',
    // React hydration mismatches (usually harmless)
    'Hydration failed',
    'There was an error while hydrating',
  ],

  // Filter transactions
  beforeSendTransaction(event) {
    // Don't send transactions for static assets
    if (event.transaction?.includes('/_next/static')) {
      return null
    }
    return event
  },

  // Sanitize sensitive data before sending
  beforeSend(event) {
    // Remove sensitive headers
    if (event.request?.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['cookie']
      delete event.request.headers['x-api-key']
    }

    // Remove sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.data?.url?.includes('token=')) {
          breadcrumb.data.url = breadcrumb.data.url.replace(/token=[^&]+/, 'token=[REDACTED]')
        }
        return breadcrumb
      })
    }

    return event
  },
})
