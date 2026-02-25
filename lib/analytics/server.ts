/**
 * Server-Side Analytics Functions
 *
 * Provides analytics tracking for server-side operations
 * including API routes and server components.
 *
 * Note: Vercel Analytics automatically tracks server metrics in production.
 * These functions provide additional custom tracking and logging.
 */

import { createServiceLogger } from '@/lib/utils/logger';
import type { ApiPerformanceData, DatabaseQueryData, PerformanceMetric } from './types';

const log = createServiceLogger('ServerAnalytics');

/**
 * Log API performance metrics (server-side)
 * These are logged for observability but also captured by Vercel Analytics automatically
 */
export function logApiPerformance(data: ApiPerformanceData): void {
  log.debug({
    method: data.method,
    endpoint: data.endpoint,
    statusCode: data.statusCode,
    success: data.success,
    durationMs: Math.round(data.duration),
    errorMessage: data.errorMessage
  }, 'API Performance');

  // In production, this data is captured by Vercel's built-in metrics
  // Additional custom logging can be sent to external services here
}

/**
 * Log database query performance (server-side)
 */
export function logDatabaseQuery(data: DatabaseQueryData): void {
  log.debug({
    operation: data.operation.toUpperCase(),
    table: data.table,
    success: data.success,
    durationMs: Math.round(data.duration),
    rowCount: data.rowCount,
    errorMessage: data.errorMessage
  }, 'Database Query');

  // Log slow queries
  if (data.duration > 1000) {
    log.warn({
      operation: data.operation.toUpperCase(),
      table: data.table,
      durationMs: Math.round(data.duration)
    }, 'Slow database query detected');
  }
}

/**
 * Log custom performance metric (server-side)
 */
export function logPerformanceMetric(metric: PerformanceMetric): void {
  log.debug({
    category: metric.category,
    name: metric.name,
    value: metric.value,
    unit: metric.unit
  }, 'Performance Metric');
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

      log.debug({
        timerName: name,
        durationMs: Math.round(duration)
      }, 'Timer completed');

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
  log.error({
    component: context.component,
    operation: context.operation,
    error: {
      message: error.message,
      stack: error.stack,
    },
    userId: context.userId,
    organizationId: context.organizationId,
  });
}
