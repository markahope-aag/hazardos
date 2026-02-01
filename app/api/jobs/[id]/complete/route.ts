import { NextRequest, NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'
import { createClient } from '@/lib/supabase/server'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const searchParams = request.nextUrl.searchParams
    const summary = searchParams.get('summary') === 'true'

    if (summary) {
      const completionSummary = await JobCompletionService.getCompletionSummary(id)
      return NextResponse.json(completionSummary)
    }

    const completion = await JobCompletionService.getCompletion(id)
    return NextResponse.json(completion)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const body = await request.json()

    // If submit flag is set, submit the completion
    if (body.submit) {
      const completion = await JobCompletionService.submitCompletion(id, {
        field_notes: body.field_notes,
        issues_encountered: body.issues_encountered,
        recommendations: body.recommendations,
      })
      return NextResponse.json(completion)
    }

    // Create or get completion
    const completion = await JobCompletionService.createCompletion({
      job_id: id,
      estimated_hours: body.estimated_hours,
      estimated_material_cost: body.estimated_material_cost,
      estimated_total: body.estimated_total,
      field_notes: body.field_notes,
      issues_encountered: body.issues_encountered,
      recommendations: body.recommendations,
    })

    return NextResponse.json(completion, { status: 201 })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const body = await request.json()

    const completion = await JobCompletionService.updateCompletion(id, {
      field_notes: body.field_notes,
      issues_encountered: body.issues_encountered,
      recommendations: body.recommendations,
      customer_signed: body.customer_signed,
      customer_signature_name: body.customer_signature_name,
      customer_signature_data: body.customer_signature_data,
    })

    return NextResponse.json(completion)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
