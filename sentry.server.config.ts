import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring - lower sample rate for server
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Environment
  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Spotlight for local development debugging
  spotlight: process.env.NODE_ENV === 'development',

  // Filter out noisy errors
  ignoreErrors: [
    // Expected auth errors
    'UNAUTHORIZED',
    'FORBIDDEN',
    // Network errors from clients
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
  ],

  // Sanitize sensitive data before sending
  beforeSend(event) {
    // Remove sensitive environment variables
    if (event.extra) {
      const sensitiveKeys = [
        'SUPABASE_SERVICE_ROLE_KEY',
        'STRIPE_SECRET_KEY',
        'TWILIO_AUTH_TOKEN',
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY',
        'SENTRY_AUTH_TOKEN',
      ]
      for (const key of sensitiveKeys) {
        if (key in event.extra) {
          delete event.extra[key]
        }
      }
    }

    // Remove authorization headers
    if (event.request?.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['cookie']
      delete event.request.headers['x-api-key']
    }

    // Sanitize URLs with tokens
    if (event.request?.url) {
      event.request.url = event.request.url.replace(/token=[^&]+/g, 'token=[REDACTED]')
    }

    return event
  },

  // Custom error grouping
  beforeSendTransaction(event) {
    // Group API errors by route pattern
    if (event.transaction?.startsWith('/api/')) {
      // Replace UUIDs with placeholder for better grouping
      event.transaction = event.transaction.replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        '[id]'
      )
    }
    return event
  },
})
