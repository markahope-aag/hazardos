import { NextResponse } from 'next/server'
import { QuickBooksService } from '@/lib/services/quickbooks-service'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * GET /api/integrations/quickbooks/status
 * Get QuickBooks connection status
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    const status = await QuickBooksService.getConnectionStatus(context.profile.organization_id)
    return NextResponse.json(status)
  }
)
