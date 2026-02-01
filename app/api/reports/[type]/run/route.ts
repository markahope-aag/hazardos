import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ReportingService } from '@/lib/services/reporting-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { type } = await params
    const body = await request.json()

    let data: unknown[]

    switch (type) {
      case 'sales':
        data = await ReportingService.runSalesReport(body)
        break
      case 'jobs':
        data = await ReportingService.runJobCostReport(body)
        break
      case 'leads':
        data = await ReportingService.runLeadSourceReport(body)
        break
      default:
        throw new SecureError('VALIDATION_ERROR', 'Invalid report type')
    }

    return NextResponse.json({ data })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
