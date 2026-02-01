/**
 * CORS Configuration
 *
 * This module provides CORS configuration for different API route types:
 * - Public API routes (/api/v1/*) - allow external access with API key
 * - Webhook endpoints - allow specific origins (Stripe, Twilio, etc.)
 * - Internal API routes - restrict to same origin
 * - OpenAPI/docs endpoints - allow public access for documentation tools
 */

export type CorsPolicy = 'public-api' | 'webhook' | 'internal' | 'openapi';

export interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge: number;
  credentials: boolean;
}

/**
 * Get allowed origins from environment variables
 * Supports comma-separated list of origins
 */
function getEnvOrigins(envKey: string): string[] {
  const origins = process.env[envKey];
  if (!origins) return [];
  return origins.split(',').map((o) => o.trim()).filter(Boolean);
}

/**
 * Check if we're in development mode
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Get the app URL from environment
 */
function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Default allowed origins for development
 */
const DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

/**
 * Known webhook provider origins/IPs
 * These are allowed to call webhook endpoints
 */
const WEBHOOK_PROVIDERS = {
  // Stripe uses IP allowlisting, not origin header
  // But we keep it here for documentation
  stripe: [] as string[],
  // Twilio uses IP allowlisting
  twilio: [] as string[],
};

/**
 * Common headers needed for API requests
 */
const COMMON_API_HEADERS = [
  'Authorization',
  'Content-Type',
  'Accept',
  'X-Requested-With',
  'X-Request-ID',
];

/**
 * Headers exposed in API responses
 */
const EXPOSED_HEADERS = [
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
  'X-Request-ID',
];

/**
 * CORS configuration for different policy types
 */
export function getCorsConfig(policy: CorsPolicy): CorsConfig {
  const appUrl = getAppUrl();
  const customOrigins = getEnvOrigins('CORS_ALLOWED_ORIGINS');
  const isDev = isDevelopment();

  switch (policy) {
    case 'public-api':
      // Public API routes - allow external access with API key authentication
      // In production, restrict to configured origins or allow all (API key provides auth)
      return {
        allowedOrigins: isDev
          ? ['*'] // More permissive in development
          : customOrigins.length > 0
            ? customOrigins
            : ['*'], // API key auth protects the endpoint
        allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [...COMMON_API_HEADERS],
        exposedHeaders: EXPOSED_HEADERS,
        maxAge: 86400, // 24 hours - API clients can cache preflight
        credentials: false, // API key auth doesn't need credentials
      };

    case 'webhook':
      // Webhook endpoints - allow specific providers
      // Webhooks typically don't send Origin headers (server-to-server)
      // But we allow any origin since webhook auth is done via signatures
      return {
        allowedOrigins: ['*'],
        allowedMethods: ['POST', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Stripe-Signature',
          'X-Twilio-Signature',
          'X-Hub-Signature-256', // GitHub webhooks
        ],
        exposedHeaders: [],
        maxAge: 86400,
        credentials: false,
      };

    case 'internal':
      // Internal API routes - restrict to same origin and configured origins
      return {
        allowedOrigins: isDev
          ? [...DEVELOPMENT_ORIGINS, appUrl, ...customOrigins]
          : [appUrl, ...customOrigins],
        allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [...COMMON_API_HEADERS],
        exposedHeaders: EXPOSED_HEADERS,
        maxAge: 600, // 10 minutes - shorter for internal APIs
        credentials: true, // Allow cookies for session auth
      };

    case 'openapi':
      // OpenAPI/docs endpoints - allow public access for documentation tools
      return {
        allowedOrigins: ['*'],
        allowedMethods: ['GET', 'OPTIONS'],
        allowedHeaders: ['Accept', 'Content-Type'],
        exposedHeaders: [],
        maxAge: 86400, // 24 hours
        credentials: false,
      };

    default:
      // Default to internal policy
      return getCorsConfig('internal');
  }
}

/**
 * Validate if an origin is allowed for a given policy
 */
export function isOriginAllowed(origin: string | null, policy: CorsPolicy): boolean {
  if (!origin) {
    // No origin header - could be same-origin or non-browser request
    // Allow for webhooks and internal requests
    return policy === 'webhook' || policy === 'internal';
  }

  const config = getCorsConfig(policy);

  // Check for wildcard
  if (config.allowedOrigins.includes('*')) {
    return true;
  }

  // Check exact match
  return config.allowedOrigins.includes(origin);
}

/**
 * Generate CORS headers for a response
 */
export function getCorsHeaders(
  origin: string | null,
  policy: CorsPolicy,
  isPreflight: boolean = false
): Record<string, string> {
  const config = getCorsConfig(policy);
  const headers: Record<string, string> = {};

  // Determine the allowed origin to return
  if (config.allowedOrigins.includes('*')) {
    // For credentials=false, we can use wildcard
    if (!config.credentials) {
      headers['Access-Control-Allow-Origin'] = '*';
    } else if (origin && isOriginAllowed(origin, policy)) {
      // With credentials, must echo back the specific origin
      headers['Access-Control-Allow-Origin'] = origin;
    }
  } else if (origin && isOriginAllowed(origin, policy)) {
    // Echo back the allowed origin
    headers['Access-Control-Allow-Origin'] = origin;
  }

  // Credentials header
  if (config.credentials && headers['Access-Control-Allow-Origin']) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  // Preflight-specific headers
  if (isPreflight) {
    headers['Access-Control-Allow-Methods'] = config.allowedMethods.join(', ');
    headers['Access-Control-Allow-Headers'] = config.allowedHeaders.join(', ');
    headers['Access-Control-Max-Age'] = config.maxAge.toString();
  }

  // Exposed headers (for all responses)
  if (config.exposedHeaders.length > 0) {
    headers['Access-Control-Expose-Headers'] = config.exposedHeaders.join(', ');
  }

  // Vary header to indicate response varies by origin
  if (!config.allowedOrigins.includes('*')) {
    headers['Vary'] = 'Origin';
  }

  return headers;
}

/**
 * Determine the CORS policy based on the request path
 */
export function getCorsPolicy(pathname: string): CorsPolicy {
  // Public API routes (v1)
  if (pathname.startsWith('/api/v1/')) {
    return 'public-api';
  }

  // Webhook endpoints
  if (pathname.startsWith('/api/webhooks/')) {
    return 'webhook';
  }

  // OpenAPI documentation
  if (pathname.startsWith('/api/openapi')) {
    return 'openapi';
  }

  // All other API routes are internal
  if (pathname.startsWith('/api/')) {
    return 'internal';
  }

  // Non-API routes don't need CORS
  return 'internal';
}
