import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'
import { labCocGenerateSchema } from '@/lib/validations/lab-coc'
import { LabCocPdf } from '@/lib/pdf/lab-coc-template'

// Renders the chain-of-custody form that travels with the samples, and
// persists the sample list so the same numbers come back on the results.
//
// Returns the PDF inline rather than storing it: the form is printed,
// signed by hand and handed over with the samples, and it is regenerated
// from the saved sample list whenever it's needed again. The lab's analysis
// summary is the artifact worth filing, and that arrives separately via the
// existing upload route.
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'heavy',
    bodySchema: labCocGenerateSchema,
    allowedRoles: ROLES.TENANT_WRITE,
  },
  async (_request, context, params, body) => {
    const reportId = params.id
    if (!reportId) throw new SecureError('VALIDATION_ERROR', 'Missing lab report id')

    const { supabase, profile, log } = context

    const { data: report, error: reportError } = await supabase
      .from('lab_reports')
      .select('id, organization_id, report_number')
      .eq('id', reportId)
      .eq('organization_id', profile.organization_id)
      .single()
    if (reportError || !report) throw new SecureError('NOT_FOUND', 'Lab report not found')

    // Persist the sample list and the form's own fields, so reopening the
    // dialog or reprinting the form reproduces exactly what went to the lab.
    const { error: updateError } = await supabase
      .from('lab_reports')
      .update({
        turnaround: body.turnaround,
        submitted_to: body.submitted_to || null,
        relinquished_by: body.relinquished_by || null,
      })
      .eq('id', report.id)
    if (updateError) {
      log.error({ updateError }, 'Failed to save chain-of-custody fields')
      throw new Error('Failed to save chain-of-custody details')
    }

    // Replace rather than merge: the dialog owns the whole list, and sample
    // numbers are the join key the lab reports back against, so a stale row
    // left behind would silently attach to the wrong result.
    const { error: deleteError } = await supabase
      .from('lab_report_samples')
      .delete()
      .eq('lab_report_id', report.id)
    if (deleteError) {
      log.error({ deleteError }, 'Failed to clear previous samples')
      throw new Error('Failed to save samples')
    }

    const { error: insertError } = await supabase.from('lab_report_samples').insert(
      body.samples.map((s, i) => ({
        organization_id: profile.organization_id,
        lab_report_id: report.id,
        sample_number: s.sample_number,
        description: s.description,
        location: s.location || null,
        sort_order: i,
      })),
    )
    if (insertError) {
      log.error({ insertError }, 'Failed to save samples')
      throw new Error('Failed to save samples')
    }

    let pdfBuffer: Buffer
    try {
      pdfBuffer = (await renderToBuffer(LabCocPdf(body))) as Buffer
    } catch (err) {
      log.error({ err }, 'Failed to render chain-of-custody PDF')
      throw new Error('Failed to render chain-of-custody PDF')
    }

    const fileName = `Chain-of-Custody-${report.report_number}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  },
)
