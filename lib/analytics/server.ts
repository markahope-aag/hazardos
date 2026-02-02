/**
 * Server-Side Analytics Functions
 *
 * Provides analytics tracking for server-side operations
 * including API routes and server components.
 *
 * Note: Vercel Analytics automatically tracks server metrics in production.
 * These functions provide additional custom tracking and logging.
 */

import type { ApiPerformanceData, DatabaseQueryData, PerformanceMetric } from './types';

/**
 * Log API performance metrics (server-side)
 * These are logged for observability but also captured by Vercel Analytics automatically
 */
export function logApiPerformance(data: ApiPerformanceData): void {
  if (process.env.NODE_ENV === 'development') {
    const status = data.success ? 'success' : 'error';
    console.log(
      `[API Performance] ${data.method} ${data.endpoint} - ${data.statusCode} (${status}) - ${Math.round(data.duration)}ms`
    );
  }

  // In production, this data is captured by Vercel's built-in metrics
  // Additional custom logging can be sent to external services here
}

/**
 * Log database query performance (server-side)
 */
export function logDatabaseQuery(data: DatabaseQueryData): void {
  if (process.env.NODE_ENV === 'development') {
    const status = data.success ? 'success' : 'error';
    console.log(
      `[DB Query] ${data.operation.toUpperCase()} ${data.table} - ${status} - ${Math.round(data.duration)}ms${
        data.rowCount !== undefined ? ` (${data.rowCount} rows)` : ''
      }`
    );
  }

  // Log slow queries
  if (data.duration > 1000) {
    console.warn(
      `[Slow Query] ${data.operation.toUpperCase()} ${data.table} took ${Math.round(data.duration)}ms`
    );
  }
}

/**
 * Log custom performance metric (server-side)
 */
export function logPerformanceMetric(metric: PerformanceMetric): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[Performance] ${metric.category}/${metric.name}: ${metric.value}${metric.unit}`
    );
  }
}

/**
 * Create a performance timer for server-side operations
 */
export function createServerTimer(name: string): {
  end: (success?: boolean) => { duration: number; success: boolean };
} {
  const startTime = performance.now();

  return {
    end: (success = true) => {
      const duration = performance.now() - startTime;

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Timer] ${name}: ${Math.round(duration)}ms`);
      }

      return { duration, success };
    },
  };
}

/**
 * Wrapper for database operations with automatic timing
 */
export async function withDatabaseTiming<T>(
  operation: DatabaseQueryData['operation'],
  table: string,
  fn: () => Promise<T>
): Promise<T> {
  const timer = createServerTimer(`db_${operation}_${table}`);

  try {
    const result = await fn();
    const { duration } = timer.end(true);

    logDatabaseQuery({
      operation,
      table,
      duration,
      success: true,
    });

    return result;
  } catch (error) {
    const { duration } = timer.end(false);

    logDatabaseQuery({
      operation,
      table,
      duration,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * Wrapper for external API calls with automatic timing
 */
export async function withApiTiming<T>(
  endpoint: string,
  method: ApiPerformanceData['method'],
  fn: () => Promise<T>
): Promise<T> {
  const timer = createServerTimer(`api_${method}_${endpoint}`);

  try {
    const result = await fn();
    const { duration } = timer.end(true);

    logApiPerformance({
      endpoint,
      method,
      statusCode: 200,
      duration,
      success: true,
    });

    return result;
  } catch (error) {
    const { duration } = timer.end(false);

    logApiPerformance({
      endpoint,
      method,
      statusCode: 500,
      duration,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * Track server-side errors for monitoring
 */
export function logServerError(
  context: {
    component: string;
    operation: string;
    userId?: string;
    organizationId?: string;
  },
  error: Error
): void {
  console.error(`[Server Error] ${context.component}/${context.operation}:`, {
    message: error.message,
    stack: error.stack,
    userId: context.userId,
    organizationId: context.organizationId,
  });
}
