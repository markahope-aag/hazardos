'use client';

import React, { ComponentType } from 'react';
import { ErrorBoundary, ErrorBoundaryProps } from './ErrorBoundary';

/**
 * Higher-order component that wraps a component with an error boundary.
 *
 * @param Component - The component to wrap
 * @param errorBoundaryProps - Props to pass to the ErrorBoundary
 * @returns A new component wrapped with an ErrorBoundary
 *
 * @example
 * ```tsx
 * // Wrap a component with default error boundary
 * const SafeChart = withErrorBoundary(RevenueChart, {
 *   name: 'RevenueChart',
 *   showDetails: true,
 * });
 *
 * // Use the wrapped component
 * <SafeChart data={chartData} />
 * ```
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  errorBoundaryProps: Omit<ErrorBoundaryProps, 'children'> = {}
): ComponentType<P> {
  const displayName = Component.displayName || Component.name || 'Component';

  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps} name={errorBoundaryProps.name || displayName}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${displayName})`;

  return WrappedComponent;
}

export default withErrorBoundary;
