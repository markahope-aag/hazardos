import { createClient } from '@/lib/supabase/client'
import type {
  OrganizationDocument,
  OrganizationDocumentInsert,
  OrganizationDocumentUpdate,
  OrganizationDocumentCategory,
  OrganizationDocumentShare,
} from '@/types/database'

const BUCKET = 'organization-documents'

export interface OrganizationDocumentWithUploader extends OrganizationDocument {
  uploader: { id: string; full_name: string | null } | null
}

export interface ShareHistoryRow extends OrganizationDocumentShare {
  shared_by_user: { id: string; full_name: string | null } | null
  document: { id: string; display_name: string; category: OrganizationDocumentCategory } | null
}

export class OrganizationDocumentsService {
  private static supabase = createClient()

  static async list(): Promise<OrganizationDocumentWithUploader[]> {
    const { data, error } = await this.supabase
      .from('organization_documents')
      .select('*, uploader:profiles!uploaded_by(id, full_name)')
      .order('category', { ascending: true })
      .order('uploaded_at', { ascending: false })

    if (error) throw new Error(`Failed to list credentials: ${error.message}`)
    return (data || []).map((row) => ({
      ...(row as OrganizationDocument),
      uploader: (() => {
        const u = (row as Record<string, unknown>).uploader
        if (!u) return null
        return Array.isArray(u)
          ? ((u[0] as { id: string; full_name: string | null }) ?? null)
          : (u as { id: string; full_name: string | null })
      })(),
    }))
  }

  static async upload(input: {
    organizationId: string
    file: File
    displayName: string
    category: OrganizationDocumentCategory
    documentNumber?: string
    issuedOn?: string | null
    expiresOn?: string | null
    issuingAuthority?: string | null
    notes?: string | null
  }): Promise<OrganizationDocument> {
    const safeName = input.file.name.replace(/[^\w.\- ]+/g, '_')
    const uniqueId = crypto.randomUUID()
    const storagePath = `${input.organizationId}/${uniqueId}-${safeName}`

    const { error: uploadError } = await this.supabase.storage
      .from(BUCKET)
      .upload(storagePath, input.file, {
        contentType: input.file.type || 'application/octet-stream',
        upsert: false,
      })
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    const row: OrganizationDocumentInsert = {
      organization_id: input.organizationId,
      file_name: input.file.name,
      storage_path: storagePath,
      mime_type: input.file.type || null,
      size_bytes: input.file.size,
      display_name: input.displayName,
      category: input.category,
      document_number: input.documentNumber || null,
      issued_on: input.issuedOn || null,
      expires_on: input.expiresOn || null,
      issuing_authority: input.issuingAuthority || null,
      notes: input.notes || null,
    }

    const { data, error } = await this.supabase
      .from('organization_documents')
      .insert([row])
      .select()
      .single()

    if (error) {
      // Roll back the orphan upload so storage doesn't accumulate ghosts.
      await this.supabase.storage.from(BUCKET).remove([storagePath])
      throw new Error(`Failed to record credential: ${error.message}`)
    }
    return data
  }

  static async update(id: string, updates: OrganizationDocumentUpdate): Promise<OrganizationDocument> {
    const { data, error } = await this.supabase
      .from('organization_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`Failed to update credential: ${error.message}`)
    return data
  }

  static async remove(id: string): Promise<void> {
    const { data: doc, error: fetchError } = await this.supabase
      .from('organization_documents')
      .select('storage_path')
      .eq('id', id)
      .single()
    if (fetchError) throw new Error(`Failed to fetch credential: ${fetchError.message}`)

    const { error: deleteError } = await this.supabase
      .from('organization_documents')
      .delete()
      .eq('id', id)
    if (deleteError) throw new Error(`Failed to delete credential: ${deleteError.message}`)

    if (doc?.storage_path) {
      await this.supabase.storage.from(BUCKET).remove([doc.storage_path])
    }
  }

  /**
   * 1-hour signed URL — for the org's own internal preview/download
   * within the settings page. External shares get a longer-lived URL
   * via the share API endpoint.
   */
  static async getSignedUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds)
    if (error || !data?.signedUrl) {
      throw new Error(`Failed to create signed URL: ${error?.message || 'unknown error'}`)
    }
    return data.signedUrl
  }

  /**
   * Share-history list — what documents have we sent out and to whom.
   * Drives the audit table in the credentials settings page.
   */
  static async listShares(): Promise<ShareHistoryRow[]> {
    const { data, error } = await this.supabase
      .from('organization_document_shares')
      .select(`
        *,
        shared_by_user:profiles!shared_by(id, full_name),
        document:organization_documents!document_id(id, display_name, category)
      `)
      .order('shared_at', { ascending: false })
      .limit(100)

    if (error) throw new Error(`Failed to list share history: ${error.message}`)
    return (data || []).map((row) => ({
      ...(row as OrganizationDocumentShare),
      shared_by_user: (() => {
        const u = (row as Record<string, unknown>).shared_by_user
        if (!u) return null
        return Array.isArray(u)
          ? ((u[0] as { id: string; full_name: string | null }) ?? null)
          : (u as { id: string; full_name: string | null })
      })(),
      document: (() => {
        const d = (row as Record<string, unknown>).document
        if (!d) return null
        return Array.isArray(d)
          ? ((d[0] as { id: string; display_name: string; category: OrganizationDocumentCategory }) ?? null)
          : (d as { id: string; display_name: string; category: OrganizationDocumentCategory })
      })(),
    }))
  }
}
