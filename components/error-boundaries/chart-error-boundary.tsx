'use client';

import React from 'react';
import { BarChart3, RefreshCw, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorBoundary, ErrorBoundaryProps, FallbackProps } from './error-boundary';

export interface ChartErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'fallback'> {
  /** Chart title */
  title?: string;
  /** Height of the chart container */
  height?: string;
  /** Whether to show a minimal/compact error state */
  compact?: boolean;
  /** Whether to wrap in a Card */
  showCard?: boolean;
}

/**
 * Error boundary specialized for chart and visualization components.
 * Handles errors from charting libraries like Recharts gracefully.
 *
 * @example
 * ```tsx
 * <ChartErrorBoundary title="Revenue Trends" height="300px">
 *   <RevenueChart data={data} />
 * </ChartErrorBoundary>
 * ```
 */
export function ChartErrorBoundary({
  children,
  title,
  height = '300px',
  compact = false,
  showCard = true,
  ...props
}: ChartErrorBoundaryProps) {
  const ChartFallback = ({ resetError }: FallbackProps) => {
    if (compact) {
      return (
        <div
          className="flex items-center justify-center gap-3 p-4 bg-muted/50 rounded-lg"
          style={{ height }}
        >
          <TrendingDown className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Chart unavailable</span>
          <Button variant="ghost" size="sm" onClick={resetError}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    const content = (
      <div
        className="flex flex-col items-center justify-center text-center"
        style={{ height }}
      >
        <div className="p-3 bg-muted rounded-full mb-4">
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h4 className="font-medium mb-1">Chart could not be rendered</h4>
        <p className="text-sm text-muted-foreground mb-4">
          There was a problem displaying this visualization
        </p>
        <Button variant="outline" size="sm" onClick={resetError}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reload chart
        </Button>
      </div>
    );

    if (!showCard) {
      return content;
    }

    return (
      <Card>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>{content}</CardContent>
      </Card>
    );
  };

  return (
    <ErrorBoundary
      fallback={ChartFallback}
      name={title ? `Chart:${title}` : 'Chart'}
      {...props}
    >
      {children}
    </ErrorBoundary>
  );
}

export default ChartErrorBoundary;
