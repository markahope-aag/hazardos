// Browser-side Sentry setup. This was sentry.client.config.ts until Sentry
// deprecated that filename: under Turbopack (which this project builds with)
// the old name is not picked up at all, so the rename is what keeps client
// error reporting working rather than a tidy-up.
// See node_modules/@sentry/nextjs/build/cjs/config/webpack.js for the lookup.
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

// App Router navigation timing. Next.js calls this hook on route transitions
// and it is only available from this file, so it could not be wired up while
// the config lived under the old name.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
