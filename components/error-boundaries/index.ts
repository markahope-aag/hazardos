/**
 * Error Boundary Components
 *
 * Provides component-level error handling with specialized boundaries
 * for different contexts: widgets, forms, data tables, and more.
 *
 * @example
 * ```tsx
 * import { WidgetErrorBoundary, FormErrorBoundary, DataErrorBoundary } from '@/components/error-boundaries';
 *
 * // Dashboard widget
 * <WidgetErrorBoundary title="Revenue Chart" retryLabel="Reload chart">
 *   <RevenueChart />
 * </WidgetErrorBoundary>
 *
 * // Form with error handling
 * <FormErrorBoundary formName="Customer Form">
 *   <CustomerForm />
 * </FormErrorBoundary>
 *
 * // Data table with retry
 * <DataErrorBoundary onRetry={() => refetch()}>
 *   <CustomerList />
 * </DataErrorBoundary>
 * ```
 */

export { ErrorBoundary } from './error-boundary';
export type { ErrorBoundaryProps, FallbackProps, ErrorLogger } from './error-boundary';

export { WidgetErrorBoundary } from './widget-error-boundary';
export type { WidgetErrorBoundaryProps } from './widget-error-boundary';

export { FormErrorBoundary } from './form-error-boundary';
export type { FormErrorBoundaryProps } from './form-error-boundary';

export { DataErrorBoundary } from './data-error-boundary';
export type { DataErrorBoundaryProps } from './data-error-boundary';

export { ChartErrorBoundary } from './chart-error-boundary';
export type { ChartErrorBoundaryProps } from './chart-error-boundary';

export { IntegrationErrorBoundary } from './integration-error-boundary';
export type { IntegrationErrorBoundaryProps } from './integration-error-boundary';

export { withErrorBoundary } from './with-error-boundary';

export { useErrorReporting } from './useErrorReporting';
export type { ErrorReport } from './useErrorReporting';
