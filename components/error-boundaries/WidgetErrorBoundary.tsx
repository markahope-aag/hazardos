'use client';

import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorBoundary, ErrorBoundaryProps, FallbackProps } from './ErrorBoundary';

export interface WidgetErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'fallback'> {
  /** Widget title to display in error state */
  title?: string;
  /** Custom retry button label */
  retryLabel?: string;
  /** Icon to display (defaults to AlertTriangle) */
  icon?: React.ReactNode;
  /** Height of the widget container */
  height?: string;
  /** Whether to show the card wrapper */
  showCard?: boolean;
}

/**
 * Error boundary specialized for dashboard widgets and cards.
 * Provides a compact, inline error display that matches widget styling.
 *
 * @example
 * ```tsx
 * <WidgetErrorBoundary title="Revenue Chart" height="300px">
 *   <RevenueChart />
 * </WidgetErrorBoundary>
 * ```
 */
export function WidgetErrorBoundary({
  children,
  title,
  retryLabel = 'Retry',
  icon,
  height = '200px',
  showCard = true,
  ...props
}: WidgetErrorBoundaryProps) {
  const WidgetFallback = ({ error, resetError }: FallbackProps) => {
    const content = (
      <div
        className="flex flex-col items-center justify-center text-center p-4"
        style={{ minHeight: height }}
      >
        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-3">
          {icon || <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-1">
          Unable to load {title ? `"${title}"` : 'widget'}
        </p>
        <p className="text-xs text-muted-foreground mb-3 max-w-[200px]">
          {error.message || 'An error occurred while loading this content'}
        </p>
        <Button variant="outline" size="sm" onClick={resetError}>
          <RefreshCw className="h-3 w-3 mr-1" />
          {retryLabel}
        </Button>
      </div>
    );

    if (!showCard) {
      return content;
    }

    return (
      <Card>
        {title && (
          <CardHeader className="pb-0">
            <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent className="p-0">{content}</CardContent>
      </Card>
    );
  };

  return (
    <ErrorBoundary
      fallback={WidgetFallback}
      name={title ? `Widget:${title}` : 'Widget'}
      {...props}
    >
      {children}
    </ErrorBoundary>
  );
}

export default WidgetErrorBoundary;
