import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ReportingService } from '@/lib/services/reporting-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const reports = await ReportingService.listReports()
    return NextResponse.json(reports)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const body = await request.json()

    if (!body.name || !body.report_type || !body.config) {
      throw new SecureError('VALIDATION_ERROR', 'name, report_type, and config are required')
    }

    const report = await ReportingService.createReport(body)
    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
