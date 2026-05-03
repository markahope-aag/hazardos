import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * GET /api/organization-documents
 * List the caller-org's credential documents. Reads through the
 * authenticated server client so RLS scopes by organization
 * automatically — no need to pass org_id.
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    const { data, error } = await context.supabase
      .from('organization_documents')
      .select('*, uploader:profiles!uploaded_by(id, full_name)')
      .eq('organization_id', context.profile.organization_id)
      .order('category', { ascending: true })
      .order('uploaded_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ documents: data || [] })
  }
)

/**
 * GET /api/organization-documents/shares
 * Audit history — what got sent to whom. Hangs off the same route
 * file in /shares for url tidiness.
 */
