import { NextRequest, NextResponse } from 'next/server';
import { ApiKeyService } from '@/lib/services/api-key-service';
import { createServiceLogger, formatError } from '@/lib/utils/logger';
import { addCorsHeaders, handlePreflight } from '@/lib/middleware/cors';
import type { ApiKey, ApiKeyScope } from '@/types/integrations';

const log = createServiceLogger('ApiKeyAuth');

export interface ApiKeyAuthContext {
  apiKey: ApiKey;
  organizationId: string;
}

interface AuthOptions {
  requiredScopes?: ApiKeyScope[];
}

export async function authenticateApiKey(
  request: NextRequest,
  options: AuthOptions = {}
): Promise<{ context?: ApiKeyAuthContext; response?: NextResponse }> {
  const startTime = Date.now();

  // Extract API key from Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      response: NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      ),
    };
  }

  const apiKeyString = authHeader.substring(7);

  // Validate the API key
  const validation = await ApiKeyService.validate(apiKeyString);
  if (!validation.valid || !validation.apiKey || !validation.organizationId) {
    return {
      response: NextResponse.json(
        { error: validation.error || 'Invalid API key' },
        { status: 401 }
      ),
    };
  }

  // Check rate limit
  const rateLimit = await ApiKeyService.checkRateLimit(validation.apiKey.id);
  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
    response.headers.set('X-RateLimit-Limit', validation.apiKey.rate_limit.toString());
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Reset', rateLimit.resetAt.toISOString());
    return { response };
  }

  // Check required scopes
  if (options.requiredScopes?.length) {
    const hasPermission = ApiKeyService.hasAnyScope(validation.apiKey, options.requiredScopes);
    if (!hasPermission) {
      return {
        response: NextResponse.json(
          { error: 'Insufficient permissions', required_scopes: options.requiredScopes },
          { status: 403 }
        ),
      };
    }
  }

  // Log the request (non-blocking)
  const path = request.nextUrl.pathname;
  const method = request.method;
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    undefined;
  const userAgent = request.headers.get('user-agent') || undefined;

  // Note: We'll log after the response is sent by the calling handler
  // Store info for later logging
  const context: ApiKeyAuthContext = {
    apiKey: validation.apiKey,
    organizationId: validation.organizationId,
  };

  // Store logging context in a closure for the wrapper to use
  (request as NextRequest & { _apiKeyLogContext?: object })._apiKeyLogContext = {
    keyId: validation.apiKey.id,
    organizationId: validation.organizationId,
    method,
    path,
    startTime,
    ipAddress,
    userAgent,
    rateLimit: {
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt,
    },
  };

  return { context };
}

export function withApiKeyAuth(
  handler: (request: NextRequest, context: ApiKeyAuthContext) => Promise<NextResponse>,
  options: AuthOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Handle CORS preflight for public API routes
    if (request.method === 'OPTIONS') {
      return handlePreflight(request, 'public-api');
    }

    const startTime = Date.now();

    const auth = await authenticateApiKey(request, options);

    if (auth.response) {
      return auth.response;
    }

    if (!auth.context) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Execute the handler
    let response: NextResponse;
    let statusCode: number;

    try {
      response = await handler(request, auth.context);
      statusCode = response.status;
    } catch (error) {
      log.error(
        {
          error: formatError(error),
          apiKeyId: auth.context.apiKey.id,
          organizationId: auth.context.organizationId,
          method: request.method,
          path: request.nextUrl.pathname,
        },
        'API v1 handler error'
      );
      response = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
      statusCode = 500;
    }

    // Add rate limit headers
    const logContext = (request as NextRequest & { _apiKeyLogContext?: {
      rateLimit?: { remaining: number; resetAt: Date };
    } })._apiKeyLogContext;

    if (logContext?.rateLimit) {
      response.headers.set('X-RateLimit-Limit', auth.context.apiKey.rate_limit.toString());
      response.headers.set('X-RateLimit-Remaining', logContext.rateLimit.remaining.toString());
      response.headers.set('X-RateLimit-Reset', logContext.rateLimit.resetAt.toISOString());
    }

    // Log the request (fire and forget)
    const responseTime = Date.now() - startTime;
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    ApiKeyService.logRequest(
      auth.context.apiKey.id,
      auth.context.organizationId,
      request.method,
      request.nextUrl.pathname,
      statusCode,
      responseTime,
      ipAddress,
      userAgent
    ).catch((err) => {
      log.error({ error: formatError(err) }, 'Failed to log API request');
    });

    // Add CORS headers for public API
    return addCorsHeaders(response, request, 'public-api');
  };
}
