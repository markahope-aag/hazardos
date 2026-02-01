import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ReportingService } from '@/lib/services/reporting-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { id } = await params
    const report = await ReportingService.getReport(id)

    if (!report) {
      throw new SecureError('NOT_FOUND', 'Report not found')
    }

    return NextResponse.json(report)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { id } = await params
    const body = await request.json()

    const report = await ReportingService.updateReport(id, body)
    return NextResponse.json(report)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { id } = await params
    await ReportingService.deleteReport(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
