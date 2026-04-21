import { createClient } from '@/lib/supabase/client'
import { sanitizeSearchQuery } from '@/lib/utils/sanitize'
import type { Customer, CustomerInsert, CustomerUpdate, CustomerStatus, ContactType } from '@/types/database'

export class CustomersService {
  private static supabase = createClient()

  static async getCustomers(
    organizationId: string,
    options: {
      search?: string
      status?: CustomerStatus
      contactType?: ContactType
      activityFilter?: 'no_contact_30' | 'no_contact_90' | 'no_contact_365'
      minRevenue?: number
      maxRevenue?: number
      minJobs?: number
      referralSource?: string
      hasOpenJobs?: boolean
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
      limit?: number
      offset?: number
    } = {}
  ): Promise<Customer[]> {
    let query = this.supabase
      .from('customers')
      .select('*, company:companies!company_id(id, name), account_owner:profiles!account_owner_id(id, first_name, last_name, full_name), open_jobs:jobs!customer_id(id)')
      .eq('organization_id', organizationId)

    if (options.search) {
      const sanitizedSearch = sanitizeSearchQuery(options.search)
      query = query.or(`name.ilike.%${sanitizedSearch}%,company_name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%,phone.ilike.%${sanitizedSearch}%`)
    }

    if (options.status) {
      query = query.eq('status', options.status)
    }

    if (options.contactType) {
      query = query.eq('contact_type', options.contactType)
    }

    // Activity-based filters
    if (options.activityFilter) {
      const now = new Date()
      const daysMap = { no_contact_30: 30, no_contact_90: 90, no_contact_365: 365 }
      const days = daysMap[options.activityFilter]
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
      query = query.or(`last_job_date.is.null,last_job_date.lt.${cutoff}`)
    }

    // Revenue filters
    if (options.minRevenue !== undefined) {
      query = query.gte('lifetime_value', options.minRevenue)
    }
    if (options.maxRevenue !== undefined) {
      query = query.lte('lifetime_value', options.maxRevenue)
    }

    // Job count filter
    if (options.minJobs !== undefined) {
      query = query.gte('total_jobs', options.minJobs)
    }


    // Referral source filter
    if (options.referralSource) {
      const safe = sanitizeSearchQuery(options.referralSource)
      query = query.or(`referral_source.ilike.%${safe}%,lead_source.ilike.%${safe}%`)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 25) - 1)
    }

    // Sorting
    const sortCol = options.sortBy || 'created_at'
    const sortAsc = (options.sortOrder || 'desc') === 'asc'
    query = query.order(sortCol, { ascending: sortAsc })

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch customers: ${error.message}`)
    }

    // Post-process: count open jobs from the joined data and filter if needed
    const results = (data || []).map((c) => {
      const openJobs = Array.isArray((c as Record<string, unknown>).open_jobs) ? ((c as Record<string, unknown>).open_jobs as unknown[]).length : 0
      return { ...c, open_jobs_count: openJobs } as Customer & { open_jobs_count: number }
    })

    if (options.hasOpenJobs === true) {
      return results.filter((c) => c.open_jobs_count > 0)
    }
    if (options.hasOpenJobs === false) {
      return results.filter((c) => c.open_jobs_count === 0)
    }

    return results
  }

  static async getCustomer(id: string): Promise<Customer | null> {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Customer not found
      }
      throw new Error(`Failed to fetch customer: ${error.message}`)
    }

    return data
  }

  static async createCustomer(customer: CustomerInsert): Promise<Customer> {
    const { data, error } = await this.supabase
      .from('customers')
      .insert([customer])
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create customer: ${error.message}`)
    }

    return data
  }

  static async updateCustomer(id: string, updates: CustomerUpdate): Promise<Customer> {
    const { data, error } = await this.supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update customer: ${error.message}`)
    }

    return data
  }

  static async deleteCustomer(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('customers')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete customer: ${error.message}`)
    }
  }

  static async getCustomerStats(organizationId: string): Promise<{
    total: number
    leads: number
    prospects: number
    customers: number
    inactive: number
  }> {
    // Use parallel count queries - more efficient than fetching all rows
    const [leadCount, prospectCount, customerCount, inactiveCount] = await Promise.all([
      this.supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'lead'),
      this.supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'prospect'),
      this.supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'customer'),
      this.supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'inactive'),
    ])

    const leads = leadCount.count || 0
    const prospects = prospectCount.count || 0
    const customers = customerCount.count || 0
    const inactive = inactiveCount.count || 0

    return {
      total: leads + prospects + customers + inactive,
      leads,
      prospects,
      customers,
      inactive,
    }
  }

  static async updateCustomerStatus(id: string, status: CustomerStatus): Promise<Customer> {
    return this.updateCustomer(id, { status })
  }

  static async searchCustomers(organizationId: string, searchTerm: string): Promise<Customer[]> {
    return this.getCustomers(organizationId, { search: searchTerm })
  }
}