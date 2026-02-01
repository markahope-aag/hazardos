import { NextResponse } from 'next/server'
import { InvoicesService } from '@/lib/services/invoices-service'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * GET /api/invoices/stats
 * Get invoice statistics
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
  },
  async () => {
    const stats = await InvoicesService.getStats()
    return NextResponse.json(stats)
  }
)
