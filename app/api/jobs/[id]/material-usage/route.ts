import { NextRequest, NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createSecureErrorResponse, validateRequired, SecureError } from '@/lib/utils/secure-error-handler'
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

    const materialUsage = await JobCompletionService.getMaterialUsage(id)
    return NextResponse.json(materialUsage)
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

    validateRequired(body.material_name, 'material_name')
    validateRequired(body.quantity_used, 'quantity_used')

    const materialUsage = await JobCompletionService.createMaterialUsage({
      job_id: id,
      job_material_id: body.job_material_id,
      material_name: body.material_name,
      material_type: body.material_type,
      quantity_estimated: body.quantity_estimated,
      quantity_used: body.quantity_used,
      unit: body.unit,
      unit_cost: body.unit_cost,
      notes: body.notes,
    })

    return NextResponse.json(materialUsage, { status: 201 })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
