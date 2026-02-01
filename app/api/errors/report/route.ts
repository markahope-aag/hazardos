import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

/**
 * Error Report API
 *
 * Receives error reports from the frontend error boundaries
 * and logs them for debugging/monitoring purposes.
 *
 * POST /api/errors/report
 */

interface ErrorReportPayload {
  name: string;
  message: string;
  stack?: string;
  componentStack?: string;
  context?: Record<string, unknown>;
  userAgent?: string;
  url?: string;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const payload: ErrorReportPayload = await request.json();

    // Validate required fields
    if (!payload.name || !payload.message) {
      return NextResponse.json(
        { error: 'Missing required error fields' },
        { status: 400 }
      );
    }

    // Log the error with structured logging
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

    // In a production environment, you might also:
    // 1. Store in a database for trend analysis
    // 2. Send to an external monitoring service (Sentry, LogRocket, etc.)
    // 3. Trigger alerts for critical errors

    // Optional: Store in database for analysis
    // Note: You would need to create an error_reports table
    /*
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profile?.organization_id) {
        await supabase.from('error_reports').insert({
          organization_id: profile.organization_id,
          user_id: user.id,
          error_name: payload.name,
          error_message: payload.message,
          error_stack: payload.stack,
          component_stack: payload.componentStack,
          context: payload.context,
          user_agent: payload.userAgent,
          page_url: payload.url,
          reported_at: payload.timestamp,
        });
      }
    }
    */

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
