'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

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

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
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