import { createClient } from '@/lib/supabase/client'
import type { Customer, CustomerInsert, CustomerUpdate } from '@/types/database'

export class CustomersService {
  private static supabase = createClient()

  // Get all customers for the user's organization
  static async getCustomers(organizationId: string, options?: {
    status?: string
    search?: string
    limit?: number
    offset?: number
  }) {
    let query = this.supabase
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (options?.status) {
      query = query.eq('status', options.status)
    }

    if (options?.search) {
      query = query.or(`name.ilike.%${options.search}%,company_name.ilike.%${options.search}%,email.ilike.%${options.search}%`)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch customers: ${error.message}`)
    }

    return data as Customer[]
  }

  // Get a single customer by ID
  static async getCustomer(id: string) {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      throw new Error(`Failed to fetch customer: ${error.message}`)
    }

    return data as Customer
  }

  // Create a new customer
  static async createCustomer(customer: CustomerInsert) {
    const { data, error } = await this.supabase
      .from('customers')
      .insert(customer)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create customer: ${error.message}`)
    }

    return data as Customer
  }

  // Update an existing customer
  static async updateCustomer(id: string, updates: CustomerUpdate) {
    const { data, error } = await this.supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update customer: ${error.message}`)
    }

    return data as Customer
  }

  // Delete a customer
  static async deleteCustomer(id: string) {
    const { error } = await this.supabase
      .from('customers')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete customer: ${error.message}`)
    }
  }

  // Get customer statistics for an organization
  static async getCustomerStats(organizationId: string) {
    const { data, error } = await this.supabase
      .from('customers')
      .select('status')
      .eq('organization_id', organizationId)

    if (error) {
      throw new Error(`Failed to fetch customer stats: ${error.message}`)
    }

    const stats = {
      total: data.length,
      leads: data.filter(c => c.status === 'lead').length,
      prospects: data.filter(c => c.status === 'prospect').length,
      customers: data.filter(c => c.status === 'customer').length,
      inactive: data.filter(c => c.status === 'inactive').length,
    }

    return stats
  }

  // Update customer status (common operation)
  static async updateCustomerStatus(id: string, status: Customer['status']) {
    return this.updateCustomer(id, { status })
  }

  // Search customers by various fields
  static async searchCustomers(organizationId: string, searchTerm: string) {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`name.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to search customers: ${error.message}`)
    }

    return data as Customer[]
  }
}