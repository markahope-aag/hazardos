'use client';

import { useEffect } from 'react';
import { track as vercelTrack } from '@vercel/analytics';
import { logger, formatError } from '@/lib/utils/logger';

/**
 * Global Error Boundary
 *
 * This catches errors in the root layout and provides a minimal
 * fallback UI. Since this replaces the entire HTML document,
 * it must render its own <html> and <body> tags.
 *
 * This is the last line of defense for error handling.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error using structured logging with console fallback
    try {
      logger.error(
        { 
          error: formatError(error, 'GLOBAL_ERROR'),
          digest: error.digest,
          url: typeof window !== 'undefined' ? window.location.href : undefined
        },
        'Global application error'
      );
    } catch (loggingError) {
      // Fallback to console if structured logging fails
      console.error('[GlobalError] Application error:', error);
      console.error('[GlobalError] Logging failed:', loggingError);
    }

    // Track critical error in analytics
    try {
      vercelTrack('critical_error', {
        error_name: error.name,
        error_message: error.message?.slice(0, 200) ?? 'Unknown error',
        error_digest: error.digest ?? null,
        url: typeof window !== 'undefined' ? window.location.pathname : null,
      });
    } catch {
      // Silently fail - analytics should never break recovery
    }

    // Attempt to report error (may fail if the app is badly broken)
    try {
      fetch('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: error.name,
          message: error.message,
          stack: error.stack,
          digest: error.digest,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          timestamp: new Date().toISOString(),
          context: { isGlobalError: true },
        }),
      }).catch(() => {
        // Silently fail
      });
    } catch {
      // Silently fail
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: '#f9fafb',
            color: '#111827',
          }}
        >
          <div
            style={{
              maxWidth: '28rem',
              width: '100%',
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            {/* Error Icon */}
            <div
              style={{
                width: '4rem',
                height: '4rem',
                margin: '0 auto 1.5rem',
                backgroundColor: '#FEE2E2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#DC2626"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
              }}
            >
              Application Error
            </h1>

            <p
              style={{
                color: '#6B7280',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
              }}
            >
              A critical error has occurred. Our team has been notified.
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <button
                onClick={reset}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#2563EB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                Try again
              </button>

              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'transparent',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Go to Dashboard
              </button>
            </div>

            {error.digest && (
              <p
                style={{
                  marginTop: '1rem',
                  fontSize: '0.75rem',
                  color: '#9CA3AF',
                }}
              >
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
