'use client';

import { useCallback } from 'react';

export interface ErrorReport {
  error: Error;
  errorInfo?: React.ErrorInfo;
  context?: Record<string, unknown>;
  userAgent?: string;
  url?: string;
  timestamp: string;
}

interface UseErrorReportingOptions {
  /** Endpoint to report errors to */
  endpoint?: string;
  /** Additional context to include with every error */
  context?: Record<string, unknown>;
  /** Whether to include browser info */
  includeBrowserInfo?: boolean;
  /** Custom error handler */
  onError?: (report: ErrorReport) => void;
}

/**
 * Hook for reporting errors to a logging/monitoring service.
 * Can be used with ErrorBoundary's onError callback.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { reportError, createErrorLogger } = useErrorReporting({
 *     context: { component: 'Dashboard' },
 *   });
 *
 *   return (
 *     <ErrorBoundary logger={createErrorLogger()}>
 *       <DashboardContent />
 *     </ErrorBoundary>
 *   );
 * }
 * ```
 */
export function useErrorReporting(options: UseErrorReportingOptions = {}) {
  const {
    endpoint = '/api/errors/report',
    context: baseContext = {},
    includeBrowserInfo = true,
    onError,
  } = options;

  /**
   * Report an error to the monitoring service
   */
  const reportError = useCallback(
    async (
      error: Error,
      errorInfo?: React.ErrorInfo,
      additionalContext?: Record<string, unknown>
    ): Promise<void> => {
      const report: ErrorReport = {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } as Error,
        errorInfo,
        context: {
          ...baseContext,
          ...additionalContext,
        },
        timestamp: new Date().toISOString(),
      };

      // Add browser info if enabled
      if (includeBrowserInfo && typeof window !== 'undefined') {
        report.userAgent = navigator.userAgent;
        report.url = window.location.href;
      }

      // Call custom error handler if provided
      onError?.(report);

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.group('Error Report');
        console.error('Error:', error);
        console.info('Context:', report.context);
        if (errorInfo) {
          console.info('Component Stack:', errorInfo.componentStack);
        }
        console.groupEnd();
      }

      // Send to endpoint in production
      if (process.env.NODE_ENV === 'production') {
        try {
          await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: error.name,
              message: error.message,
              stack: error.stack,
              componentStack: errorInfo?.componentStack,
              context: report.context,
              userAgent: report.userAgent,
              url: report.url,
              timestamp: report.timestamp,
            }),
          });
        } catch (reportingError) {
          // Silently fail - don't crash the app if error reporting fails
          console.error('Failed to report error:', reportingError);
        }
      }
    },
    [endpoint, baseContext, includeBrowserInfo, onError]
  );

  /**
   * Create an error logger compatible with ErrorBoundary
   */
  const createErrorLogger = useCallback(
    (additionalContext?: Record<string, unknown>) => ({
      logError: (
        error: Error,
        errorInfo: React.ErrorInfo,
        boundaryContext?: Record<string, unknown>
      ) => {
        reportError(error, errorInfo, { ...additionalContext, ...boundaryContext });
      },
    }),
    [reportError]
  );

  /**
   * Wrap an async function with error reporting
   */
  const withErrorReporting = useCallback(
    <T extends (...args: unknown[]) => Promise<unknown>>(
      fn: T,
      operationName: string
    ): T => {
      return (async (...args: unknown[]) => {
        try {
          return await fn(...args);
        } catch (error) {
          if (error instanceof Error) {
            reportError(error, undefined, { operation: operationName });
          }
          throw error;
        }
      }) as T;
    },
    [reportError]
  );

  return {
    reportError,
    createErrorLogger,
    withErrorReporting,
  };
}

export default useErrorReporting;
