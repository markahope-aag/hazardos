import { NextRequest, NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'
import { createClient } from '@/lib/supabase/server'

type RouteParams = { params: Promise<{ id: string; usageId: string }> }

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { usageId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const body = await request.json()

    const materialUsage = await JobCompletionService.updateMaterialUsage(usageId, {
      material_name: body.material_name,
      material_type: body.material_type,
      quantity_estimated: body.quantity_estimated,
      quantity_used: body.quantity_used,
      unit: body.unit,
      unit_cost: body.unit_cost,
      notes: body.notes,
    })

    return NextResponse.json(materialUsage)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { usageId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    await JobCompletionService.deleteMaterialUsage(usageId)

    return NextResponse.json({ success: true })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
