import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit';
import { createRequestLogger, formatError } from '@/lib/utils/logger';

/**
 * Public SMS opt-in endpoint.
 * Accepts a phone number and records consent for matching customers.
 * No authentication required — this is a customer-facing form submission.
 */
export async function POST(request: NextRequest) {
  const log = createRequestLogger({
    requestId: crypto.randomUUID(),
    method: 'POST',
    path: '/api/sms/opt-in',
  });

  try {
    // Rate limit: use 'auth' tier (stricter) to prevent abuse
    const rateLimitResponse = await applyUnifiedRateLimit(request, 'auth');
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const { phone, name } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Normalize phone
    const digits = phone.replace(/\D/g, '');
    let normalized: string;

    if (digits.length === 10) {
      normalized = `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      normalized = `+${digits}`;
    } else {
      return NextResponse.json({ error: 'Invalid US phone number' }, { status: 400 });
    }

    const supabase = await createClient();

    // Find customers matching this phone number (across all orgs)
    const { data: customers, error: findError } = await supabase
      .from('customers')
      .select('id, phone')
      .or(`phone.eq.${normalized},phone.eq.${digits},phone.ilike.%${digits.slice(-10)}`);

    if (findError) {
      log.error({ error: formatError(findError, 'CUSTOMER_LOOKUP_ERROR') }, 'Customer lookup failed');
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }

    if (customers && customers.length > 0) {
      // Update existing customers with opt-in
      for (const customer of customers) {
        await supabase
          .from('customers')
          .update({
            sms_opt_in: true,
            sms_opt_in_at: new Date().toISOString(),
            sms_opt_out_at: null,
          })
          .eq('id', customer.id);
      }

      log.warn(
        { phone: normalized, customersUpdated: customers.length },
        'SMS opt-in recorded for existing customers'
      );
    } else {
      // No matching customer — log for manual follow-up
      // We don't create a customer record from a public form to avoid spam
      log.warn(
        { phone: normalized, name: name || 'unknown' },
        'SMS opt-in from unknown phone number — no matching customer'
      );
    }

    return NextResponse.json({
      success: true,
      message: 'SMS consent recorded. You will receive text messages at the number provided.',
    });
  } catch (error) {
    log.error({ error: formatError(error, 'SMS_OPTIN_ERROR') }, 'SMS opt-in error');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
