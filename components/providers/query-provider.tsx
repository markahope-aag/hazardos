'use client'

import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from '@/components/ui/use-toast'

// Check if error is a client error (4xx) that shouldn't be retried
function isClientError(error: unknown): boolean {
  if (error instanceof Error && 'status' in error) {
    const status = (error as { status: number }).status
    return status >= 400 && status < 500
  }
  // Check for fetch Response errors
  if (error instanceof Response) {
    return error.status >= 400 && error.status < 500
  }
  return false
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'The server ran into a problem. Please try again.'
}

/**
 * Global read-query error handler (X27). Bridges a failed GET to the toaster so
 * a 500 no longer fails silently. Skips 4xx client errors (usually expected —
 * handled by redirects/empty states) and queries that opt out via
 * `meta: { suppressGlobalErrorToast: true }` because they render their own error
 * UI. Exported for unit testing.
 */
export function reportQueryError(
  error: unknown,
  query: { meta?: Record<string, unknown> }
): void {
  if (isClientError(error)) return
  if (query.meta?.suppressGlobalErrorToast) return
  toast({
    variant: 'destructive',
    title: 'Something went wrong',
    description: getErrorMessage(error),
  })
}

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // Global read-error surfacing (X27). Per-hook mutations already toast
        // their own specific messages on error; read queries did not, so a
        // failed GET (e.g. a 500) landed in `isError` silently and the user saw
        // an empty/zero widget with no signal. This bridges query errors to the
        // toaster. Client errors (4xx — 401/403/404, usually expected and
        // handled by redirects or inline empty states) are intentionally NOT
        // toasted; only server/network failures are. A query can opt out by
        // setting `meta: { suppressGlobalErrorToast: true }` when it renders its
        // own error UI. TOAST_LIMIT=1 collapses a burst of simultaneous
        // failures into a single toast.
        queryCache: new QueryCache({
          onError: (error, query) => reportQueryError(error, query),
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute - data considered fresh
            gcTime: 5 * 60 * 1000, // 5 minutes - unused data kept in cache
            refetchOnWindowFocus: false,
            refetchOnReconnect: true, // Refetch when network reconnects
            retry: (failureCount, error) => {
              // Don't retry client errors (401, 403, 404, etc.)
              if (isClientError(error)) return false
              // Retry server errors up to 2 times
              return failureCount < 2
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            retry: false, // Don't retry mutations by default
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}