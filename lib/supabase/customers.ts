import { createClient } from '@/lib/supabase/client'
import { sanitizeSearchQuery } from '@/lib/utils/sanitize'
import type { Customer, CustomerInsert, CustomerUpdate, CustomerStatus } from '@/types/database'

export class CustomersService {
  private static supabase = createClient()

  static async getCustomers(
    organizationId: string,
    options: {
      search?: string
      status?: CustomerStatus
      limit?: number
      offset?: number
    } = {}
  ): Promise<Customer[]> {
    let query = this.supabase
      .from('customers')
      .select('id, organization_id, name, company_name, email, phone, status, customer_type, lead_source, address_line1, city, state, zip, created_at, updated_at')
      .eq('organization_id', organizationId)

    if (options.search) {
      const sanitizedSearch = sanitizeSearchQuery(options.search)
      query = query.or(`name.ilike.%${sanitizedSearch}%,company_name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%,phone.ilike.%${sanitizedSearch}%`)
    }

    if (options.status) {
      query = query.eq('status', options.status)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 25) - 1)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch customers: ${error.message}`)
    }

    return data || []
  }

  static async getCustomer(id: string): Promise<Customer | null> {
    const { data, error } = await this.supabase
      .from('customers')
      .select('id, organization_id, name, first_name, last_name, company_name, email, phone, mobile, fax, website, status, customer_type, lead_source, address_line1, address_line2, city, state, zip, country, notes, tags, billing_email, billing_address_line1, billing_address_line2, billing_city, billing_state, billing_zip, billing_country, tax_id, preferred_contact_method, do_not_email, do_not_call, do_not_sms, created_at, updated_at, created_by, qb_customer_id, qb_synced_at, mailchimp_id, mailchimp_synced_at, hubspot_id, hubspot_synced_at')
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