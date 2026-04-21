import { createClient } from '@/lib/supabase/client'
import { sanitizeSearchQuery } from '@/lib/utils/sanitize'
import type { Company, CompanyInsert, CompanyUpdate, AccountStatus, CompanyType } from '@/types/database'

export interface CompanyWithPrimaryContact extends Company {
  primary_contact: {
    id: string
    first_name: string | null
    last_name: string | null
    name: string | null
    email: string | null
    mobile_phone: string | null
  } | null
}

export class CompaniesService {
  private static supabase = createClient()

  static async getCompanies(
    organizationId: string,
    options: {
      search?: string
      status?: AccountStatus
      companyType?: CompanyType
      activityFilter?: 'no_activity_30' | 'no_activity_90' | 'no_activity_365'
      minRevenue?: number
      maxRevenue?: number
      industry?: string
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
      limit?: number
      offset?: number
    } = {}
  ): Promise<CompanyWithPrimaryContact[]> {
    let query = this.supabase
      .from('companies')
      .select('*, primary_contact:customers!company_id(id, first_name, last_name, name, email, mobile_phone)')
      .eq('organization_id', organizationId)

    if (options.search) {
      const sanitizedSearch = sanitizeSearchQuery(options.search)
      query = query.or(`name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%,phone.ilike.%${sanitizedSearch}%,industry.ilike.%${sanitizedSearch}%`)
    }

    if (options.status) {
      query = query.eq('account_status', options.status)
    }

    if (options.companyType) {
      query = query.eq('company_type', options.companyType)
    }

    // Activity-based filters (using updated_at as proxy)
    if (options.activityFilter) {
      const now = new Date()
      const daysMap = { no_activity_30: 30, no_activity_90: 90, no_activity_365: 365 }
      const days = daysMap[options.activityFilter]
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
      query = query.lt('updated_at', cutoff)
    }

    // Revenue filters
    if (options.minRevenue !== undefined) {
      query = query.gte('lifetime_value', options.minRevenue)
    }
    if (options.maxRevenue !== undefined) {
      query = query.lte('lifetime_value', options.maxRevenue)
    }

    // Industry filter
    if (options.industry) {
      const safe = sanitizeSearchQuery(options.industry)
      query = query.ilike('industry', `%${safe}%`)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 25) - 1)
    }

    // Sorting
    const sortCol = options.sortBy || 'name'
    const sortAsc = (options.sortOrder || 'asc') === 'asc'
    query = query.order(sortCol, { ascending: sortAsc })

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch companies: ${error.message}`)
    }

    // PostgREST returns the joined primary_contact as an array; pick the first
    const results = (data || []).map((c) => {
      const contacts = (c as Record<string, unknown>).primary_contact
      const firstContact = Array.isArray(contacts) ? contacts[0] ?? null : contacts ?? null
      return { ...c, primary_contact: firstContact } as CompanyWithPrimaryContact
    })

    return results
  }

  static async getCompany(id: string): Promise<Company | null> {
    const { data, error } = await this.supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to fetch company: ${error.message}`)
    }

    return data
  }

  static async createCompany(company: CompanyInsert): Promise<Company> {
    const { data, error } = await this.supabase
      .from('companies')
      .insert([company])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create company: ${error.message}`)
    }

    return data
  }

  static async updateCompany(id: string, updates: CompanyUpdate): Promise<Company> {
    const { data, error } = await this.supabase
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update company: ${error.message}`)
    }

    return data
  }

  static async deleteCompany(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('companies')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete company: ${error.message}`)
    }
  }

  static async getCompanyStats(organizationId: string): Promise<{
    total: number
    active: number
    inactive: number
  }> {
    const [activeCount, inactiveCount] = await Promise.all([
      this.supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('account_status', 'active'),
      this.supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .neq('account_status', 'active'),
    ])

    const active = activeCount.count || 0
    const inactive = inactiveCount.count || 0

    return { total: active + inactive, active, inactive }
  }

  static async searchCompanies(organizationId: string, searchTerm: string): Promise<Company[]> {
    return this.getCompanies(organizationId, { search: searchTerm, limit: 20 })
  }
}
