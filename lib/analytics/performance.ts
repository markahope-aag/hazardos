/**
 * Performance Monitoring Functions
 *
 * Provides utilities for tracking performance metrics
 * including API timing, database queries, and custom marks.
 */

import { track } from './track';
import type { ApiPerformanceData, DatabaseQueryData, PerformanceMetric } from './types';

/**
 * Performance marks storage for measuring durations
 */
const performanceMarks = new Map<string, number>();

/**
 * Track API route performance
 */
export function trackApiPerformance(data: ApiPerformanceData): void {
  track('api_performance', {
    endpoint: data.endpoint,
    method: data.method,
    status_code: data.statusCode,
    duration_ms: Math.round(data.duration),
    success: data.success,
    error_message: data.errorMessage?.slice(0, 200) ?? null,
  });

  // Track slow APIs separately for alerting
  if (data.duration > 3000) {
    track('slow_api', {
      endpoint: data.endpoint,
      method: data.method,
      duration_ms: Math.round(data.duration),
    });
  }
}

/**
 * Track database query performance
 */
export function trackDatabaseQuery(data: DatabaseQueryData): void {
  track('database_query', {
    operation: data.operation,
    table: data.table,
    duration_ms: Math.round(data.duration),
    row_count: data.rowCount ?? null,
    success: data.success,
    error_message: data.errorMessage?.slice(0, 200) ?? null,
  });

  // Track slow queries separately for alerting
  if (data.duration > 1000) {
    track('slow_query', {
      operation: data.operation,
      table: data.table,
      duration_ms: Math.round(data.duration),
    });
  }
}

/**
 * Track a custom performance metric
 */
export function trackPerformanceMetric(metric: PerformanceMetric): void {
  track('performance_metric', {
    metric_name: metric.name,
    value: metric.value,
    unit: metric.unit,
    category: metric.category,
    ...metric.metadata,
  });
}

/**
 * Mark the start of a performance measurement
 */
export function markPerformance(markName: string): void {
  performanceMarks.set(markName, performance.now());

  // Also use native Performance API if available
  if (typeof performance !== 'undefined' && performance.mark) {
    try {
      performance.mark(`${markName}-start`);
    } catch {
      // Ignore if Performance API fails
    }
  }
}

/**
 * Measure the duration since a mark was set and track it
 */
export function measurePerformance(
  markName: string,
  category: PerformanceMetric['category'] = 'custom'
): number | null {
  const startTime = performanceMarks.get(markName);
  if (startTime === undefined) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Analytics] Performance mark "${markName}" not found`);
    }
    return null;
  }

  const duration = performance.now() - startTime;
  performanceMarks.delete(markName);

  // Also use native Performance API if available
  if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
    try {
      performance.mark(`${markName}-end`);
      performance.measure(markName, `${markName}-start`, `${markName}-end`);
    } catch {
      // Ignore if Performance API fails
    }
  }

  trackPerformanceMetric({
    name: markName,
    value: Math.round(duration),
    unit: 'ms',
    category,
  });

  return duration;
}

/**
 * Create a performance timer that can be used with async operations
 */
export function createPerformanceTimer(name: string): {
  end: (success?: boolean) => number;
  cancel: () => void;
} {
  const startTime = performance.now();

  return {
    end: (success = true) => {
      const duration = performance.now() - startTime;
      trackPerformanceMetric({
        name,
        value: Math.round(duration),
        unit: 'ms',
        category: 'custom',
        metadata: { success },
      });
      return duration;
    },
    cancel: () => {
      // No-op, just prevents tracking
    },
  };
}

/**
 * Higher-order function to wrap async functions with performance tracking
 */
export function withPerformanceTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  name: string,
  _category: PerformanceMetric['category'] = 'custom'
): T {
  return (async (...args: Parameters<T>) => {
    const timer = createPerformanceTimer(name);
    try {
      const result = await fn(...args);
      timer.end(true);
      return result;
    } catch (error) {
      timer.end(false);
      throw error;
    }
  }) as T;
}

/**
 * Track component render time
 */
export function trackRenderTime(componentName: string, duration: number): void {
  trackPerformanceMetric({
    name: `render_${componentName}`,
    value: Math.round(duration),
    unit: 'ms',
    category: 'render',
  });

  // Track slow renders separately
  if (duration > 100) {
    track('slow_render', {
      component: componentName,
      duration_ms: Math.round(duration),
    });
  }
}

/**
 * Track network request timing
 */
export function trackNetworkTiming(
  url: string,
  method: string,
  duration: number,
  size?: number
): void {
  const urlPath = new URL(url, 'http://localhost').pathname;

  track('network_timing', {
    path: urlPath,
    method,
    duration_ms: Math.round(duration),
    size_bytes: size ?? null,
  });
}
