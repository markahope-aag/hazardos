'use client';

/**
 * Fetch Tracker
 *
 * Wraps fetch calls to automatically track API performance.
 * Use this for client-side API calls to monitor response times
 * and error rates.
 */

import { trackApiPerformance, trackError } from './index';

interface FetchOptions extends RequestInit {
  /**
   * Skip analytics tracking for this request
   */
  skipAnalytics?: boolean;
}

/**
 * Tracked fetch function that automatically monitors API performance
 */
export async function trackedFetch(
  input: RequestInfo | URL,
  init?: FetchOptions
): Promise<Response> {
  const { skipAnalytics, ...fetchInit } = init ?? {};

  if (skipAnalytics) {
    return fetch(input, fetchInit);
  }

  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = (fetchInit?.method?.toUpperCase() || 'GET') as
    | 'GET'
    | 'POST'
    | 'PUT'
    | 'PATCH'
    | 'DELETE';

  // Extract pathname for tracking
  let endpoint: string;
  try {
    const parsedUrl = new URL(url, window.location.origin);
    endpoint = parsedUrl.pathname;
  } catch {
    endpoint = url;
  }

  const startTime = performance.now();

  try {
    const response = await fetch(input, fetchInit);
    const duration = performance.now() - startTime;

    trackApiPerformance({
      endpoint,
      method,
      statusCode: response.status,
      duration,
      success: response.ok,
      errorMessage: response.ok ? undefined : response.statusText,
    });

    return response;
  } catch (error) {
    const duration = performance.now() - startTime;

    // Track network/fetch error
    trackApiPerformance({
      endpoint,
      method,
      statusCode: 0,
      duration,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Network error',
    });

    trackError({
      errorType: 'network',
      errorMessage: error instanceof Error ? error.message : 'Fetch failed',
      component: 'trackedFetch',
      action: `${method} ${endpoint}`,
    });

    throw error;
  }
}

/**
 * Create a tracked fetch function with default options
 */
export function createTrackedFetch(defaultOptions?: FetchOptions) {
  return (input: RequestInfo | URL, init?: FetchOptions): Promise<Response> => {
    return trackedFetch(input, { ...defaultOptions, ...init });
  };
}

/**
 * Higher-order function to wrap existing API client functions with tracking
 */
export function withFetchTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  operationName: string
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = performance.now();

    try {
      const result = await fn(...args);
      const duration = performance.now() - startTime;

      trackApiPerformance({
        endpoint: operationName,
        method: 'GET', // Generic for wrapped operations
        statusCode: 200,
        duration,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      trackApiPerformance({
        endpoint: operationName,
        method: 'GET',
        statusCode: error instanceof Error && 'status' in error ? (error as { status: number }).status : 500,
        duration,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }) as T;
}
