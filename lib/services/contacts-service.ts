import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import type {
  CustomerContact,
  CreateContactInput,
  UpdateContactInput,
} from '@/types/contacts'

export class ContactsService {
  /**
   * List all contacts for a customer
   */
  static async list(customerId: string): Promise<CustomerContact[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data, error } = await supabase
      .from('customer_contacts')
      .select('id, organization_id, customer_id, name, title, email, phone, mobile, role, is_primary, preferred_contact_method, notes, created_at, updated_at')
      .eq('customer_id', customerId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throwDbError(error, 'fetch contacts')

    return data || []
  }

  /**
   * Get a single contact by ID
   */
  static async get(contactId: string): Promise<CustomerContact | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data, error } = await supabase
      .from('customer_contacts')
      .select('id, organization_id, customer_id, name, title, email, phone, mobile, role, is_primary, preferred_contact_method, notes, created_at, updated_at')
      .eq('id', contactId)
      .single()

    if (error) return null

    return data
  }

  /**
   * Create a new contact
   */
  static async create(input: CreateContactInput): Promise<CustomerContact> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new SecureError('UNAUTHORIZED')

    // Check if this will be the first contact (make it primary)
    const { count } = await supabase
      .from('customer_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', input.customer_id)

    const isPrimary = input.is_primary || count === 0

    const { data, error } = await supabase
      .from('customer_contacts')
      .insert({
        organization_id: profile.organization_id,
        customer_id: input.customer_id,
        name: input.name,
        title: input.title,
        email: input.email,
        phone: input.phone,
        mobile: input.mobile,
        role: input.role || 'general',
        is_primary: isPrimary,
        preferred_contact_method: input.preferred_contact_method,
        notes: input.notes,
      })
      .select()
      .single()

    if (error) throwDbError(error, 'create contact')

    // Get customer name for activity log
    const { data: customer } = await supabase
      .from('customers')
      .select('name')
      .eq('id', input.customer_id)
      .single()

    await Activity.created('contact', data.id, `${input.name} (${customer?.name || 'Unknown'})`)

    return data
  }

  /**
   * Update an existing contact
   */
  static async update(contactId: string, input: UpdateContactInput): Promise<CustomerContact> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    // Get current contact for activity log
    const { data: current } = await supabase
      .from('customer_contacts')
      .select('*, customer:customers(name)')
      .eq('id', contactId)
      .single()

    if (!current) throw new SecureError('NOT_FOUND', 'Contact not found')

    const { data, error } = await supabase
      .from('customer_contacts')
      .update({
        name: input.name,
        title: input.title,
        email: input.email,
        phone: input.phone,
        mobile: input.mobile,
        role: input.role,
        is_primary: input.is_primary,
        preferred_contact_method: input.preferred_contact_method,
        notes: input.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId)
      .select()
      .single()

    if (error) throwDbError(error, 'update contact')

    const customerData = Array.isArray(current.customer) ? current.customer[0] : current.customer
    await Activity.updated('contact', data.id, `${data.name} (${customerData?.name || 'Unknown'})`)

    return data
  }

  /**
   * Delete a contact
   */
  static async delete(contactId: string): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    // Get contact for activity log
    const { data: contact } = await supabase
      .from('customer_contacts')
      .select('name, customer:customers(name)')
      .eq('id', contactId)
      .single()

    const { error } = await supabase
      .from('customer_contacts')
      .delete()
      .eq('id', contactId)

    if (error) throwDbError(error, 'delete contact')

    if (contact) {
      const customerData = Array.isArray(contact.customer) ? contact.customer[0] : contact.customer
      await Activity.deleted('contact', contactId, `${contact.name} (${customerData?.name || 'Unknown'})`)
    }
  }

  /**
   * Set a contact as primary
   */
  static async setPrimary(contactId: string): Promise<CustomerContact> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data, error } = await supabase
      .from('customer_contacts')
      .update({
        is_primary: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId)
      .select('*, customer:customers(name)')
      .single()

    if (error) throwDbError(error, 'update contact')

    const customerData = Array.isArray(data.customer) ? data.customer[0] : data.customer
    await Activity.updated('contact', data.id, `${data.name} set as primary (${customerData?.name || 'Unknown'})`)

    return data
  }

  /**
   * Get contacts by role for a customer
   */
  static async getByRole(customerId: string, role: string): Promise<CustomerContact[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data, error } = await supabase
      .from('customer_contacts')
      .select('id, organization_id, customer_id, name, title, email, phone, mobile, role, is_primary, preferred_contact_method, notes, created_at, updated_at')
      .eq('customer_id', customerId)
      .eq('role', role)
      .order('is_primary', { ascending: false })

    if (error) throwDbError(error, 'fetch contacts')

    return data || []
  }

  /**
   * Get primary contact for a customer
   */
  static async getPrimary(customerId: string): Promise<CustomerContact | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data, error } = await supabase
      .from('customer_contacts')
      .select('id, organization_id, customer_id, name, title, email, phone, mobile, role, is_primary, preferred_contact_method, notes, created_at, updated_at')
      .eq('customer_id', customerId)
      .eq('is_primary', true)
      .single()

    if (error) return null

    return data
  }
}
