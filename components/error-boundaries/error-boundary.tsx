'use client';

import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Error logging hook interface
export interface ErrorLogger {
  logError: (error: Error, errorInfo: React.ErrorInfo, context?: Record<string, unknown>) => void;
}

// Default console logger
const defaultLogger: ErrorLogger = {
  logError: (error, errorInfo, context) => {
    console.error('[ErrorBoundary] Caught error:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack,
      context,
      timestamp: new Date().toISOString(),
    });
  },
};

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback component to render when an error occurs */
  fallback?: ReactNode | ((props: FallbackProps) => ReactNode);
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Custom error logger implementation */
  logger?: ErrorLogger;
  /** Additional context to include in error logs */
  context?: Record<string, unknown>;
  /** Name for this boundary (useful for debugging) */
  name?: string;
  /** Whether to show technical details in the fallback UI */
  showDetails?: boolean;
  /** Custom retry handler */
  onRetry?: () => void;
  /** Minimum height for the error fallback */
  minHeight?: string;
  /** Whether this is a full-page boundary */
  fullPage?: boolean;
}

export interface FallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo;
  resetError: () => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * A reusable React error boundary component that catches JavaScript errors
 * in its child component tree, logs them, and displays a fallback UI.
 *
 * @example
 * ```tsx
 * <ErrorBoundary name="Dashboard" onError={handleError}>
 *   <DashboardContent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { onError, logger = defaultLogger, context, name } = this.props;

    // Update state with error info
    this.setState({ errorInfo });

    // Log the error
    logger.logError(error, errorInfo, {
      boundaryName: name,
      ...context,
    });

    // Call optional onError callback
    onError?.(error, errorInfo);
  }

  resetError = (): void => {
    const { onRetry } = this.props;
    this.setState({ hasError: false, error: null, errorInfo: null });
    onRetry?.();
  };

  render(): ReactNode {
    const { children, fallback, showDetails, minHeight, fullPage } = this.props;
    const { hasError, error, errorInfo } = this.state;

    if (hasError && error && errorInfo) {
      // If a custom fallback is provided
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback({
            error,
            errorInfo,
            resetError: this.resetError,
            showDetails,
          });
        }
        return fallback;
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          resetError={this.resetError}
          showDetails={showDetails}
          minHeight={minHeight}
          fullPage={fullPage}
        />
      );
    }

    return children;
  }
}

interface DefaultErrorFallbackProps extends FallbackProps {
  minHeight?: string;
  fullPage?: boolean;
}

/**
 * Default error fallback component shown when an error occurs
 */
function DefaultErrorFallback({
  error,
  resetError,
  showDetails = process.env.NODE_ENV === 'development',
  minHeight = '200px',
  fullPage = false,
}: DefaultErrorFallbackProps) {
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  const containerClasses = cn(
    'flex flex-col items-center justify-center p-6',
    fullPage ? 'min-h-[400px]' : ''
  );

  return (
    <div className={containerClasses} style={{ minHeight: fullPage ? undefined : minHeight }}>
      <Card className={cn('w-full', fullPage ? 'max-w-md' : 'max-w-sm')}>
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 p-2 bg-destructive/10 rounded-full w-fit">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-lg">Something went wrong</CardTitle>
          <CardDescription>
            {error.message || 'An unexpected error occurred'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={resetError} size="sm" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try again
          </Button>

          {showDetails && (
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setIsDetailsOpen(!isDetailsOpen)}
              >
                <Bug className="h-4 w-4 mr-2" />
                Technical Details
                {isDetailsOpen ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>

              {isDetailsOpen && (
                <div className="mt-2 p-3 bg-muted rounded-md text-xs font-mono overflow-auto max-h-40">
                  <p className="font-semibold text-destructive">{error.name}: {error.message}</p>
                  {error.stack && (
                    <pre className="mt-2 whitespace-pre-wrap text-muted-foreground">
                      {error.stack.split('\n').slice(1, 6).join('\n')}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ErrorBoundary;
