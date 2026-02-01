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

export { ErrorBoundary } from './ErrorBoundary';
export type { ErrorBoundaryProps, FallbackProps, ErrorLogger } from './ErrorBoundary';

export { WidgetErrorBoundary } from './WidgetErrorBoundary';
export type { WidgetErrorBoundaryProps } from './WidgetErrorBoundary';

export { FormErrorBoundary } from './FormErrorBoundary';
export type { FormErrorBoundaryProps } from './FormErrorBoundary';

export { DataErrorBoundary } from './DataErrorBoundary';
export type { DataErrorBoundaryProps } from './DataErrorBoundary';

export { ChartErrorBoundary } from './ChartErrorBoundary';
export type { ChartErrorBoundaryProps } from './ChartErrorBoundary';

export { IntegrationErrorBoundary } from './IntegrationErrorBoundary';
export type { IntegrationErrorBoundaryProps } from './IntegrationErrorBoundary';

export { withErrorBoundary } from './withErrorBoundary';

export { useErrorReporting } from './useErrorReporting';
export type { ErrorReport } from './useErrorReporting';
