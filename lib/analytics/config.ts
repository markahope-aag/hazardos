/**
 * Analytics Configuration
 *
 * Centralized configuration for analytics behavior,
 * including privacy settings and sampling rates.
 */

import type { AnalyticsConfig } from './types';

/**
 * Default analytics configuration
 */
export const defaultConfig: AnalyticsConfig = {
  enabled: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development',
  sampleRate: 1.0, // 100% of events
  respectDoNotTrack: true,
  excludePaths: [
    '/api/health',
    '/api/ping',
    '/_next',
    '/favicon.ico',
  ],
};

/**
 * Check if analytics should be enabled based on user preferences
 */
export function shouldTrack(): boolean {
  // Check if running in browser
  if (typeof window === 'undefined') {
    return false;
  }

  // Check if analytics is enabled in config
  if (!defaultConfig.enabled && !defaultConfig.debug) {
    return false;
  }

  // Respect Do Not Track header if configured
  if (defaultConfig.respectDoNotTrack) {
    const dnt = navigator.doNotTrack || (window as unknown as { doNotTrack?: string }).doNotTrack;
    if (dnt === '1' || dnt === 'yes') {
      return false;
    }
  }

  // Apply sampling rate
  if (defaultConfig.sampleRate < 1) {
    return Math.random() < defaultConfig.sampleRate;
  }

  return true;
}

/**
 * Check if a path should be excluded from tracking
 */
export function isExcludedPath(path: string): boolean {
  return defaultConfig.excludePaths.some(
    (excludedPath) => path.startsWith(excludedPath)
  );
}

/**
 * Get sanitized properties for tracking
 * Removes any potentially sensitive data
 */
export function sanitizeProperties(
  properties: Record<string, unknown>
): Record<string, string | number | boolean | null> {
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'auth',
    'credential',
    'ssn',
    'social_security',
    'credit_card',
    'card_number',
    'cvv',
    'pin',
    'private_key',
    'access_token',
    'refresh_token',
  ];

  const sanitized: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(properties)) {
    // Skip sensitive keys
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      continue;
    }

    // Only include serializable values
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      sanitized[key] = value as string | number | boolean | null;
    } else if (value !== undefined) {
      // Convert objects to string representation
      try {
        sanitized[key] = JSON.stringify(value).slice(0, 100);
      } catch {
        sanitized[key] = '[Object]';
      }
    }
  }

  return sanitized;
}
