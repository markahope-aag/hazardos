'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Home, Bug, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface PageErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Page-level error boundary component for Next.js error.tsx files.
 * This is used by the app router for route-level error handling.
 *
 * For component-level error boundaries, use the components from
 * @/components/error-boundaries instead.
 */
export default function PageErrorBoundary({ error, reset }: PageErrorBoundaryProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[PageErrorBoundary] Caught error:', error);
    }

    // Report error to backend in production
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: error.name,
          message: error.message,
          stack: error.stack,
          digest: error.digest,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Silently fail if error reporting fails
      });
    }
  }, [error]);

  const handleReportError = async () => {
    try {
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: error.name,
          message: error.message,
          stack: error.stack,
          digest: error.digest,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          timestamp: new Date().toISOString(),
          context: { userReported: true },
        }),
      });
      setReportSent(true);
    } catch {
      // Silently fail
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-destructive/10 rounded-full w-fit">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            {error.message || 'An unexpected error occurred. Please try again.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={reset} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try again
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>

          {/* Report Error Button */}
          {!reportSent ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReportError}
              className="text-muted-foreground"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Report this issue
            </Button>
          ) : (
            <p className="text-xs text-green-600 text-center">
              Thank you! The error has been reported.
            </p>
          )}

          {/* Technical Details (development only or on demand) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setShowDetails(!showDetails)}
              >
                <Bug className="h-4 w-4 mr-2" />
                Technical Details
                {showDetails ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>

              {showDetails && (
                <div className="mt-2 p-3 bg-muted rounded-md text-xs font-mono overflow-auto max-h-48">
                  <p className="font-semibold text-destructive">
                    {error.name}: {error.message}
                  </p>
                  {error.stack && (
                    <pre className="mt-2 whitespace-pre-wrap text-muted-foreground">
                      {error.stack.split('\n').slice(1, 8).join('\n')}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}

          {error.digest && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Error ID: {error.digest}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
