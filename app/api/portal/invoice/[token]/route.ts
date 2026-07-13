import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * GET /api/portal/invoice/[token]
 * Public, read-only invoice view for customers (I13). Backed by the
 * get_invoice_for_portal SECURITY DEFINER function, which returns an
 * explicit allowlist of customer-facing fields — anon has no direct RLS
 * access to invoices, customers, or organizations.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const rateLimitResponse = await applyUnifiedRateLimit(request, 'public')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { token } = await params
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_invoice_for_portal', {
      p_token: token,
    })

    if (error || !data) {
      throw new SecureError('NOT_FOUND', 'Invoice not found')
    }

    return NextResponse.json({ invoice: data })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
