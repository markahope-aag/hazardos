import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * GET /api/organization-documents/shares
 * Audit history of credentials shares — used by the settings page
 * to show "what we sent, to whom, when" for compliance review.
 */
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    const { data, error } = await context.supabase
      .from('organization_document_shares')
      .select(`
        *,
        shared_by_user:profiles!shared_by(id, full_name),
        document:organization_documents!document_id(id, display_name, category)
      `)
      .eq('organization_id', context.profile.organization_id)
      .order('shared_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return NextResponse.json({ shares: data || [] })
  }
)
