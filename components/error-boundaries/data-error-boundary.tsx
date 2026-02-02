'use client';

import React from 'react';
import { Database, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorBoundary, ErrorBoundaryProps, FallbackProps } from './error-boundary';

export interface DataErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'fallback'> {
  /** Label for the data being loaded */
  dataLabel?: string;
  /** Whether to show a card wrapper */
  showCard?: boolean;
  /** Minimum height for the error container */
  minHeight?: string;
  /** Custom empty state when there's an error */
  emptyMessage?: string;
}

/**
 * Error boundary specialized for data tables, lists, and data-heavy components.
 * Provides data-centric error messaging with retry functionality.
 *
 * @example
 * ```tsx
 * <DataErrorBoundary dataLabel="customers" onRetry={() => refetch()}>
 *   <CustomerList customers={customers} />
 * </DataErrorBoundary>
 * ```
 */
export function DataErrorBoundary({
  children,
  dataLabel = 'data',
  showCard = true,
  minHeight = '200px',
  emptyMessage,
  ...props
}: DataErrorBoundaryProps) {
  const DataFallback = ({ error, resetError }: FallbackProps) => {
    const content = (
      <div
        className="flex flex-col items-center justify-center text-center p-6"
        style={{ minHeight }}
      >
        <div className="p-3 bg-muted rounded-full mb-4">
          <Database className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <h3 className="font-medium">Failed to load {dataLabel}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          {emptyMessage || error.message || `We couldn't load the ${dataLabel}. This might be a temporary issue.`}
        </p>
        <Button variant="default" size="sm" onClick={resetError}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reload {dataLabel}
        </Button>
      </div>
    );

    if (!showCard) {
      return content;
    }

    return (
      <Card>
        <CardContent className="p-0">{content}</CardContent>
      </Card>
    );
  };

  return (
    <ErrorBoundary
      fallback={DataFallback}
      name={`Data:${dataLabel}`}
      {...props}
    >
      {children}
    </ErrorBoundary>
  );
}

export default DataErrorBoundary;
