import { createClient } from '@/lib/supabase/client'
import { sanitizeSearchQuery } from '@/lib/utils/sanitize'
import type { Customer, CustomerInsert, CustomerUpdate, CustomerStatus, ContactType } from '@/types/database'

// Job statuses that count as "open" — i.e. work the customer still has on the
// books. 'invoiced' is included because the job is considered open until paid.
const OPEN_JOB_STATUSES = ['scheduled', 'in_progress', 'invoiced'] as const

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
      // 'unassigned' matches records where location_id IS NULL
      locationId?: string | 'unassigned'
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
      limit?: number
      offset?: number
    } = {}
  ): Promise<Customer[]> {
    // For hasOpenJobs === true we use a PostgREST !inner join so customers
    // without an open job are filtered out at the database level — that lets
    // pagination work correctly. The other cases keep a left-join.
    const wantsOpenOnly = options.hasOpenJobs === true
    const openJobsJoin = wantsOpenOnly
      ? 'open_jobs:jobs!customer_id!inner(id, status)'
      : 'open_jobs:jobs!customer_id(id, status)'

    let query = this.supabase
      .from('customers')
      // Explicit column list rather than '*' — the customers table has
      // ~50 columns (full attribution, communication prefs, marketing
      // consent, notes, etc.) and the list view only renders ~14. Keep
      // the filter/sort columns in the SELECT so the API still works.
      .select(
        `id, organization_id, name, first_name, last_name, company_name, company_id,
         email, phone, mobile_phone, office_phone, title, contact_type, contact_role,
         status, source, lead_source, referral_source, is_primary_contact,
         location_id, account_owner_id, lifetime_value, total_jobs, last_job_date,
         created_at, updated_at,
         company:companies!company_id(id, name),
         account_owner:profiles!account_owner_id(id, first_name, last_name, full_name),
         ${openJobsJoin}`,
      )
      .eq('organization_id', organizationId)
      // Constrain the embedded jobs to truly open ones — without this filter
      // the join returns terminal jobs (completed/cancelled/etc.) too, which
      // would over-count "open jobs" for every customer.
      .in('open_jobs.status', [...OPEN_JOB_STATUSES])

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

    // Location scope
    if (options.locationId === 'unassigned') {
      query = query.is('location_id', null)
    } else if (options.locationId) {
      query = query.eq('location_id', options.locationId)
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

    // Post-process: count open jobs from the joined data. The embedded
    // resource is already filtered to open statuses via the .in() above,
    // and hasOpenJobs === true is enforced server-side via !inner — so
    // open_jobs_count > 0 is guaranteed for that case.
    // Cast through unknown — the SELECT is narrowed and rows are missing
    // address fields, attribution columns, etc. The list view never reads them.
    const results = (data || []).map((c) => {
      const openJobs = Array.isArray((c as Record<string, unknown>).open_jobs) ? ((c as Record<string, unknown>).open_jobs as unknown[]).length : 0
      return { ...c, open_jobs_count: openJobs } as unknown as Customer & { open_jobs_count: number }
    })

    // hasOpenJobs === false: PostgREST can't express "NOT EXISTS open_jobs"
    // directly, so we still post-filter. This is best-effort — combined with
    // pagination, some customers without open jobs may not appear if the
    // page-of-N is filled by ones that do. Acceptable for a niche filter.
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
    inquiries: number
    prospects: number
    customers: number
    pastCustomers: number
    inactive: number
  }> {
    // Use parallel count queries - more efficient than fetching all rows
    const [inquiryCount, prospectCount, customerCount, pastCustomerCount, inactiveCount] = await Promise.all([
      this.supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'inquiry'),
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
        .eq('status', 'past_customer'),
      this.supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'inactive'),
    ])

    const inquiries = inquiryCount.count || 0
    const prospects = prospectCount.count || 0
    const customers = customerCount.count || 0
    const pastCustomers = pastCustomerCount.count || 0
    const inactive = inactiveCount.count || 0

    return {
      total: inquiries + prospects + customers + pastCustomers + inactive,
      inquiries,
      prospects,
      customers,
      pastCustomers,
      inactive,
    }
  }

  static async updateCustomerStatus(id: string, status: CustomerStatus): Promise<Customer> {
    return this.updateCustomer(id, { status })
  }

  static async searchCustomers(organizationId: string, searchTerm: string): Promise<Customer[]> {
    return this.getCustomers(organizationId, { search: searchTerm })
  }

  // Bulk operations. RLS still scopes every row to the caller's organization
  // (and delete to admins/owners), so an id from another org is silently
  // excluded rather than causing an error.

  static async bulkDeleteCustomers(ids: string[]): Promise<void> {
    const { error } = await this.supabase
      .from('customers')
      .delete()
      .in('id', ids)

    if (error) {
      throw new Error(`Failed to delete customers: ${error.message}`)
    }
  }

  static async bulkUpdateStatus(ids: string[], status: CustomerStatus): Promise<void> {
    const { error } = await this.supabase
      .from('customers')
      .update({ status })
      .in('id', ids)

    if (error) {
      throw new Error(`Failed to update customers: ${error.message}`)
    }
  }

  static async bulkAssignOwner(ids: string[], accountOwnerId: string | null): Promise<void> {
    const { error } = await this.supabase
      .from('customers')
      .update({ account_owner_id: accountOwnerId })
      .in('id', ids)

    if (error) {
      throw new Error(`Failed to assign owner: ${error.message}`)
    }
  }
}