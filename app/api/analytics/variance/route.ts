import { NextRequest, NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const searchParams = request.nextUrl.searchParams
    const summary = searchParams.get('summary') === 'true'

    const filters = {
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      customer_id: searchParams.get('customer_id') || undefined,
      hazard_types: searchParams.get('hazard_types')?.split(',').filter(Boolean) || undefined,
      variance_threshold: searchParams.get('variance_threshold')
        ? parseFloat(searchParams.get('variance_threshold')!)
        : undefined,
    }

    if (summary) {
      const varianceSummary = await JobCompletionService.getVarianceSummary(filters)
      return NextResponse.json(varianceSummary)
    }

    const variance = await JobCompletionService.getVarianceAnalysis(filters)
    return NextResponse.json(variance)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
