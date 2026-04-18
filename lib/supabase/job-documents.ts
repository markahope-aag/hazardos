import { createClient } from '@/lib/supabase/client'
import type {
  JobDocument,
  JobDocumentInsert,
  JobDocumentUpdate,
  JobDocumentCategory,
} from '@/types/database'

const BUCKET = 'job-documents'

export interface JobDocumentWithUploader extends JobDocument {
  uploader: { id: string; full_name: string | null } | null
}

export class JobDocumentsService {
  private static supabase = createClient()

  static async list(jobId: string): Promise<JobDocumentWithUploader[]> {
    const { data, error } = await this.supabase
      .from('job_documents')
      .select(
        '*, uploader:profiles!uploaded_by(id, full_name)',
      )
      .eq('job_id', jobId)
      .order('uploaded_at', { ascending: false })

    if (error) throw new Error(`Failed to list job documents: ${error.message}`)
    return (data || []).map((row) => ({
      ...(row as JobDocument),
      uploader: (() => {
        const u = (row as Record<string, unknown>).uploader
        if (!u) return null
        return Array.isArray(u) ? (u[0] as { id: string; full_name: string | null }) ?? null : (u as { id: string; full_name: string | null })
      })(),
    }))
  }

  // Uploads the file to storage and records the row. Storage path convention
  // is {org_id}/{job_id}/{uuid}-{safeName} — the first folder segment is what
  // the storage RLS policy compares against to enforce org scoping.
  static async upload(input: {
    organizationId: string
    jobId: string
    file: File
    category: JobDocumentCategory
    notes?: string
  }): Promise<JobDocument> {
    const safeName = input.file.name.replace(/[^\w.\- ]+/g, '_')
    const uniqueId = crypto.randomUUID()
    const storagePath = `${input.organizationId}/${input.jobId}/${uniqueId}-${safeName}`

    const { error: uploadError } = await this.supabase.storage
      .from(BUCKET)
      .upload(storagePath, input.file, {
        contentType: input.file.type || 'application/octet-stream',
        upsert: false,
      })
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    const row: JobDocumentInsert = {
      organization_id: input.organizationId,
      job_id: input.jobId,
      file_name: input.file.name,
      storage_path: storagePath,
      mime_type: input.file.type || null,
      size_bytes: input.file.size,
      category: input.category,
      notes: input.notes || null,
    }

    const { data, error } = await this.supabase
      .from('job_documents')
      .insert([row])
      .select()
      .single()

    if (error) {
      // Clean up the orphan file so we don't accumulate storage ghosts.
      await this.supabase.storage.from(BUCKET).remove([storagePath])
      throw new Error(`Failed to record document: ${error.message}`)
    }
    return data
  }

  static async update(id: string, updates: JobDocumentUpdate): Promise<JobDocument> {
    const { data, error } = await this.supabase
      .from('job_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`Failed to update document: ${error.message}`)
    return data
  }

  static async remove(id: string): Promise<void> {
    const { data: doc, error: fetchError } = await this.supabase
      .from('job_documents')
      .select('storage_path')
      .eq('id', id)
      .single()
    if (fetchError) throw new Error(`Failed to fetch document: ${fetchError.message}`)

    const { error: deleteError } = await this.supabase
      .from('job_documents')
      .delete()
      .eq('id', id)
    if (deleteError) throw new Error(`Failed to delete document: ${deleteError.message}`)

    if (doc?.storage_path) {
      await this.supabase.storage.from(BUCKET).remove([doc.storage_path])
    }
  }

  // Signed URLs are used for download + inline preview. 1h is long enough to
  // open a PDF in a new tab without risking a stale link sitting in chat
  // history for days.
  static async getSignedUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds)
    if (error || !data?.signedUrl) {
      throw new Error(`Failed to create signed URL: ${error?.message || 'unknown error'}`)
    }
    return data.signedUrl
  }
}
