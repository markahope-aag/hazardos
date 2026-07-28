import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'
import { wasteLabelGenerateSchema } from '@/lib/validations/waste-label'
import { WasteLabelPdf } from '@/lib/pdf/waste-label-template'

const BUCKET = 'job-documents'

// Renders a printable Avery 5162 sheet of waste container labels, uploads
// it to the job-documents bucket, and records a job_documents row tagged
// `waste_label` so it appears on the job's Documents tab ready to print
// and take to site.
//
// Gated to TENANT_FIELD: the crew running containers out is the crew that
// needs to reprint a sheet, and job_documents is already a field-tier
// table. It writes only job_documents and storage — nothing in the
// TENANT_WRITE tier — so a technician's generation completes end to end.
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'heavy',
    bodySchema: wasteLabelGenerateSchema,
    allowedRoles: ROLES.TENANT_FIELD,
  },
  async (_request, context, params, body) => {
    const jobId = params.id
    if (!jobId) throw new SecureError('VALIDATION_ERROR', 'Missing job id')

    const { supabase, profile, user, log } = context

    // Verify the job belongs to the caller's org before doing any work.
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, organization_id, job_number')
      .eq('id', jobId)
      .eq('organization_id', profile.organization_id)
      .single()
    if (jobError || !job) throw new SecureError('NOT_FOUND', 'Job not found')

    let pdfBuffer: Buffer
    try {
      pdfBuffer = (await renderToBuffer(WasteLabelPdf(body))) as Buffer
    } catch (err) {
      log.error({ err }, 'Failed to render waste label PDF')
      throw new Error('Failed to render waste label PDF')
    }

    const stamp = new Date().toISOString().slice(0, 10)
    const fileName = `Waste-Labels-${job.job_number}-${stamp}.pdf`
    const storagePath = `${profile.organization_id}/${job.id}/${crypto.randomUUID()}-${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })
    if (uploadError) {
      log.error({ uploadError }, 'Failed to upload waste label PDF')
      throw new Error('Failed to upload waste label PDF')
    }

    const { data: doc, error: insertError } = await supabase
      .from('job_documents')
      .insert({
        organization_id: profile.organization_id,
        job_id: job.id,
        file_name: fileName,
        storage_path: storagePath,
        mime_type: 'application/pdf',
        size_bytes: pdfBuffer.length,
        category: 'waste_label',
        notes: `${body.label_count} label${body.label_count === 1 ? '' : 's'} — generator ${body.generator}`,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (insertError || !doc) {
      // Roll back the orphan file so storage doesn't accumulate ghosts.
      await supabase.storage.from(BUCKET).remove([storagePath])
      log.error({ insertError }, 'Failed to record waste label document')
      throw new Error('Failed to record waste label document')
    }

    return NextResponse.json(doc, { status: 201 })
  },
)
