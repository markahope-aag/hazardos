import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit';
import { logger } from '@/lib/utils/logger';

/**
 * Error Report API
 *
 * Receives error reports from the frontend error boundaries
 * and logs them for debugging/monitoring purposes.
 *
 * POST /api/errors/report
 */

const errorReportSchema = z.object({
  name: z.string().max(100),
  message: z.string().max(500),
  stack: z.string().max(5000).optional(),
  componentStack: z.string().max(3000).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  userAgent: z.string().max(300).optional(),
  url: z.string().url().max(500).optional(),
  timestamp: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  // Client-reported errors are unauthenticated by design — anonymous users
  // can hit error boundaries too — so rate-limit to blunt any floods of
  // forged reports. The auth session, if one exists, is attached to the
  // Sentry event below but not required.
  const rateLimitResponse = await applyUnifiedRateLimit(request, 'general');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const raw = await request.json();
    const parsed = errorReportSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid error report' }, { status: 400 });
    }
    const payload = parsed.data;

    logger.error(
      {
        error: {
          name: payload.name,
          message: payload.message,
          stack: payload.stack,
        },
        componentStack: payload.componentStack,
        context: payload.context,
        userAgent: payload.userAgent,
        url: payload.url,
        userId: user?.id,
        timestamp: payload.timestamp,
      },
      'Client-side error reported'
    );

    const reconstructed = new Error(payload.message);
    reconstructed.name = payload.name;
    if (payload.stack) reconstructed.stack = payload.stack;

    Sentry.captureException(reconstructed, {
      tags: { source: 'client-error-boundary' },
      user: user ? { id: user.id } : undefined,
      contexts: {
        react: payload.componentStack ? { componentStack: payload.componentStack } : undefined,
        client: {
          userAgent: payload.userAgent,
          url: payload.url,
          timestamp: payload.timestamp,
        },
      },
      extra: payload.context,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Don't fail if error reporting fails
    logger.error({ error }, 'Failed to process error report');
    return NextResponse.json(
      { error: 'Failed to process error report' },
      { status: 500 }
    );
  }
}
