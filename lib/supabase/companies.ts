import { createClient } from '@/lib/supabase/client'
import { sanitizeSearchQuery } from '@/lib/utils/sanitize'
import type { Company, CompanyInsert, CompanyUpdate, AccountStatus } from '@/types/database'

export class CompaniesService {
  private static supabase = createClient()

  static async getCompanies(
    organizationId: string,
    options: {
      search?: string
      status?: AccountStatus
      limit?: number
      offset?: number
    } = {}
  ): Promise<Company[]> {
    let query = this.supabase
      .from('companies')
      .select('*')
      .eq('organization_id', organizationId)

    if (options.search) {
      const sanitizedSearch = sanitizeSearchQuery(options.search)
      query = query.or(`name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%,phone.ilike.%${sanitizedSearch}%,industry.ilike.%${sanitizedSearch}%`)
    }

    if (options.status) {
      query = query.eq('account_status', options.status)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 25) - 1)
    }

    query = query.order('name', { ascending: true })

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch companies: ${error.message}`)
    }

    return data || []
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
