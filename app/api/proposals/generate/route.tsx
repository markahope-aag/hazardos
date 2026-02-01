import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { ProposalPDF } from '@/lib/pdf/proposal-template'
import { createSecureErrorResponse, SecureError, validateRequired } from '@/lib/utils/secure-error-handler'
import type { ProposalData, ProposalGenerateRequest } from '@/types/proposal'
import type { EquipmentNeeded, MaterialNeeded } from '@/types/database'
import { generateProposalNumber } from '@/types/proposal'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting for heavy operations (PDF generation)
    const rateLimitResponse = await applyUnifiedRateLimit(request, 'heavy')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new SecureError('UNAUTHORIZED')
    }

    // Get request body
    const body: ProposalGenerateRequest = await request.json()
    const { estimateId, customTerms } = body

    validateRequired(estimateId, 'estimateId')

    // Fetch estimate with assessment data
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select(`
        *,
        assessments (
          *,
          organizations (*)
        )
      `)
      .eq('id', estimateId)
      .single()

    if (estimateError || !estimate) {
      throw new SecureError('NOT_FOUND', 'Estimate not found')
    }

    const assessment = estimate.assessments as {
      job_name: string
      customer_name: string
      customer_email: string | null
      customer_phone: string | null
      site_address: string
      site_city: string
      site_state: string
      site_zip: string
      hazard_type: string
      hazard_subtype: string | null
      containment_level: number | null
      area_sqft: number | null
      linear_ft: number | null
      notes: string | null
      organizations: {
        name: string
        address: string | null
        city: string | null
        state: string | null
        zip: string | null
        phone: string | null
        email: string | null
        license_number: string | null
      }
    }

    if (!assessment || !assessment.organizations) {
      throw new SecureError('NOT_FOUND', 'Assessment or organization data not found')
    }

    const org = assessment.organizations

    // Parse equipment and materials from JSONB
    const equipmentItems = (estimate.equipment_needed as EquipmentNeeded[]) || []
    const materialItems = (estimate.materials_needed as MaterialNeeded[]) || []

    // Calculate labor cost
    const laborCost = estimate.estimated_labor_hours * estimate.labor_rate_per_hour

    // Calculate subtotal
    const subtotal = laborCost + estimate.equipment_cost + estimate.materials_cost + estimate.disposal_cost

    // Calculate markup amount
    const markupAmount = subtotal * (estimate.markup_percentage / 100)

    // Calculate valid until date (default 30 days)
    const validDays = customTerms?.validDays || 30
    const proposalDate = new Date()
    const validUntil = new Date(proposalDate)
    validUntil.setDate(validUntil.getDate() + validDays)

    // Build scope of work from assessment
    const scopeParts: string[] = []
    scopeParts.push(`${assessment.hazard_type.charAt(0).toUpperCase() + assessment.hazard_type.slice(1)} remediation services at the specified location.`)
    if (assessment.hazard_subtype) {
      scopeParts.push(`Material type: ${assessment.hazard_subtype}.`)
    }
    if (assessment.area_sqft) {
      scopeParts.push(`Approximate area: ${assessment.area_sqft.toLocaleString()} square feet.`)
    }
    if (assessment.containment_level) {
      scopeParts.push(`Containment level ${assessment.containment_level} procedures will be followed.`)
    }
    scopeParts.push(`Estimated project duration: ${estimate.estimated_duration_days} working days.`)
    scopeParts.push('All work will be performed in accordance with applicable regulations.')

    // Build proposal data
    const proposalData: ProposalData = {
      organization: {
        name: org.name,
        address: org.address,
        city: org.city,
        state: org.state,
        zip: org.zip,
        phone: org.phone,
        email: org.email,
        license_number: org.license_number,
      },
      customerName: assessment.customer_name,
      customerEmail: assessment.customer_email,
      customerPhone: assessment.customer_phone,
      siteAddress: assessment.site_address,
      siteCity: assessment.site_city,
      siteState: assessment.site_state,
      siteZip: assessment.site_zip,
      jobName: assessment.job_name,
      hazardType: assessment.hazard_type,
      hazardSubtype: assessment.hazard_subtype,
      containmentLevel: assessment.containment_level,
      areaSqft: assessment.area_sqft,
      linearFt: assessment.linear_ft,
      estimatedDurationDays: estimate.estimated_duration_days,
      crewSize: estimate.crew_size,
      crewType: estimate.crew_type,
      laborCost,
      laborHours: estimate.estimated_labor_hours,
      laborRate: estimate.labor_rate_per_hour,
      equipmentItems,
      equipmentCost: estimate.equipment_cost,
      materialItems,
      materialsCost: estimate.materials_cost,
      disposalMethod: estimate.disposal_method,
      disposalCost: estimate.disposal_cost,
      subtotal,
      markupPercentage: estimate.markup_percentage,
      markupAmount,
      totalPrice: estimate.total_price,
      proposalNumber: generateProposalNumber(),
      proposalDate: proposalDate.toISOString(),
      validUntil: validUntil.toISOString(),
      paymentTerms: customTerms?.paymentTerms,
      scopeOfWork: scopeParts.join(' '),
      exclusions: customTerms?.exclusions || [
        'Clearance air testing (available as add-on)',
        'Repair or replacement of removed materials',
        'Permits and inspection fees',
        'Work outside normal business hours',
      ],
      notes: assessment.notes,
    }

    // Generate PDF
    const pdfBuffer = await renderToBuffer(<ProposalPDF data={proposalData} />)

    // Return PDF with appropriate headers
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="proposal-${proposalData.proposalNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
