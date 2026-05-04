import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { oppGenerateSchema } from '@/lib/validations/opp'
import { OppPdf } from '@/lib/pdf/opp-template'

const BUCKET = 'job-documents'

// Generates a Wisconsin OPP PDF from the wizard payload, uploads it to
// the job-documents bucket, and records a job_documents row tagged as
// `opp` so it shows up immediately in the OPP card on the job's
// Documents tab.
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'heavy',
    bodySchema: oppGenerateSchema,
  },
  async (_request, context, params, body) => {
    const jobId = params.id
    if (!jobId) throw new SecureError('VALIDATION_ERROR', 'Missing job id')

    const { supabase, profile, user, log } = context

    // Verify the job belongs to the user's org before doing any work.
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, organization_id, job_number')
      .eq('id', jobId)
      .eq('organization_id', profile.organization_id)
      .single()
    if (jobError || !job) throw new SecureError('NOT_FOUND', 'Job not found')

    // Render the PDF. renderToBuffer returns a Node Buffer in the API
    // route context — `as Buffer` is only there because the upstream
    // type lists Buffer | Uint8Array.
    let pdfBuffer: Buffer
    try {
      pdfBuffer = (await renderToBuffer(OppPdf(body))) as Buffer
    } catch (err) {
      log.error({ err }, 'Failed to render OPP PDF')
      throw new Error('Failed to render OPP PDF')
    }

    const fileName = `OPP-${job.job_number}-${body.project_start_date}.pdf`
    const uniqueId = crypto.randomUUID()
    const storagePath = `${profile.organization_id}/${job.id}/${uniqueId}-${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })
    if (uploadError) {
      log.error({ uploadError }, 'Failed to upload OPP PDF')
      throw new Error('Failed to upload OPP PDF')
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
        category: 'opp',
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (insertError || !doc) {
      // Roll back the orphan file so storage doesn't accumulate ghosts.
      await supabase.storage.from(BUCKET).remove([storagePath])
      log.error({ insertError }, 'Failed to record OPP document')
      throw new Error('Failed to record OPP document')
    }

    return NextResponse.json(doc, { status: 201 })
  },
)
