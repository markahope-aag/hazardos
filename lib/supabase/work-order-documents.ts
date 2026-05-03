import { createClient } from '@/lib/supabase/client'
import type {
  WorkOrderDocument,
  WorkOrderDocumentInsert,
  WorkOrderDocumentUpdate,
  WorkOrderDocumentCategory,
} from '@/types/work-orders'

const BUCKET = 'work-order-documents'

export interface WorkOrderDocumentWithUploader extends WorkOrderDocument {
  uploader: { id: string; full_name: string | null } | null
}

export class WorkOrderDocumentsService {
  private static supabase = createClient()

  static async list(workOrderId: string): Promise<WorkOrderDocumentWithUploader[]> {
    const { data, error } = await this.supabase
      .from('work_order_documents')
      .select('*, uploader:profiles!uploaded_by(id, full_name)')
      .eq('work_order_id', workOrderId)
      .order('uploaded_at', { ascending: false })

    if (error) throw new Error(`Failed to list work order documents: ${error.message}`)
    return (data || []).map((row) => ({
      ...(row as WorkOrderDocument),
      uploader: (() => {
        const u = (row as Record<string, unknown>).uploader
        if (!u) return null
        return Array.isArray(u)
          ? (u[0] as { id: string; full_name: string | null }) ?? null
          : (u as { id: string; full_name: string | null })
      })(),
    }))
  }

  // Storage path: {org_id}/{work_order_id}/{uuid}-{safeName}. The first
  // folder segment is what the storage RLS policy compares against.
  static async upload(input: {
    organizationId: string
    workOrderId: string
    file: File
    category: WorkOrderDocumentCategory
    notes?: string
  }): Promise<WorkOrderDocument> {
    const safeName = input.file.name.replace(/[^\w.\- ]+/g, '_')
    const uniqueId = crypto.randomUUID()
    const storagePath = `${input.organizationId}/${input.workOrderId}/${uniqueId}-${safeName}`

    const { error: uploadError } = await this.supabase.storage
      .from(BUCKET)
      .upload(storagePath, input.file, {
        contentType: input.file.type || 'application/octet-stream',
        upsert: false,
      })
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    const row: WorkOrderDocumentInsert = {
      organization_id: input.organizationId,
      work_order_id: input.workOrderId,
      file_name: input.file.name,
      storage_path: storagePath,
      mime_type: input.file.type || null,
      size_bytes: input.file.size,
      category: input.category,
      notes: input.notes || null,
    }

    const { data, error } = await this.supabase
      .from('work_order_documents')
      .insert([row])
      .select()
      .single()

    if (error) {
      // Roll back the orphan file so we don't accumulate storage ghosts.
      await this.supabase.storage.from(BUCKET).remove([storagePath])
      throw new Error(`Failed to record document: ${error.message}`)
    }
    return data
  }

  static async update(
    id: string,
    updates: WorkOrderDocumentUpdate,
  ): Promise<WorkOrderDocument> {
    const { data, error } = await this.supabase
      .from('work_order_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`Failed to update document: ${error.message}`)
    return data
  }

  static async remove(id: string): Promise<void> {
    const { data: doc, error: fetchError } = await this.supabase
      .from('work_order_documents')
      .select('storage_path')
      .eq('id', id)
      .single()
    if (fetchError) throw new Error(`Failed to fetch document: ${fetchError.message}`)

    const { error: deleteError } = await this.supabase
      .from('work_order_documents')
      .delete()
      .eq('id', id)
    if (deleteError) throw new Error(`Failed to delete document: ${deleteError.message}`)

    if (doc?.storage_path) {
      await this.supabase.storage.from(BUCKET).remove([doc.storage_path])
    }
  }

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
