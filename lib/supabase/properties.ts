import { createClient } from '@/lib/supabase/client'
import { sanitizeSearchQuery } from '@/lib/utils/sanitize'
import type {
  Property,
  PropertyInsert,
  PropertyUpdate,
  PropertyContact,
  PropertyContactInsert,
  PropertyContactUpdate,
  Customer,
  SiteSurvey,
} from '@/types/database'
import type { Job } from '@/types/jobs'
import type { Opportunity } from '@/types/sales'

export interface PropertyWithCounts extends Property {
  current_contact_count: number
  past_contact_count: number
  job_count: number
}

export interface PropertyContactWithContact extends PropertyContact {
  contact: Pick<Customer, 'id' | 'name' | 'first_name' | 'last_name' | 'email' | 'phone' | 'mobile_phone'> | null
}

export interface PropertyHistory {
  property: Property
  contacts: PropertyContactWithContact[]
  site_surveys: Pick<SiteSurvey, 'id' | 'job_name' | 'hazard_type' | 'status' | 'created_at' | 'scheduled_date'>[]
  opportunities: Pick<Opportunity, 'id' | 'name' | 'opportunity_status' | 'estimated_value' | 'created_at'>[]
  jobs: Pick<Job, 'id' | 'job_number' | 'status' | 'created_at' | 'scheduled_start_date'>[]
}

export class PropertiesService {
  private static supabase = createClient()

  static async listProperties(
    organizationId: string,
    options: {
      search?: string
      limit?: number
      offset?: number
      sortBy?: 'recent' | 'address' | 'city' | 'jobs'
      sortDir?: 'asc' | 'desc'
    } = {}
  ): Promise<PropertyWithCounts[]> {
    const sortBy = options.sortBy ?? 'recent'
    const sortDir = options.sortDir ?? (sortBy === 'recent' || sortBy === 'jobs' ? 'desc' : 'asc')

    let query = this.supabase
      .from('properties')
      .select(
        '*, property_contacts(id, is_current), jobs(id)',
      )
      .eq('organization_id', organizationId)

    if (options.search) {
      const term = sanitizeSearchQuery(options.search)
      query = query.or(
        `address_line1.ilike.%${term}%,city.ilike.%${term}%,state.ilike.%${term}%,zip.ilike.%${term}%,normalized_address.ilike.%${term}%`,
      )
    }

    // Server-side sort for address/city/recent; jobs sort has to happen
    // client-side because PostgREST can't order by an aggregate count
    // on an embedded resource without a view or RPC. For that case we
    // pull a wider batch and sort in memory below.
    if (sortBy === 'address') {
      query = query.order('address_line1', { ascending: sortDir === 'asc' })
    } else if (sortBy === 'city') {
      query = query
        .order('city', { ascending: sortDir === 'asc', nullsFirst: false })
        .order('address_line1', { ascending: true })
    } else if (sortBy === 'recent') {
      query = query.order('updated_at', { ascending: sortDir === 'asc' })
    }

    if (sortBy === 'jobs') {
      // Client-side sort path. Cap the pull at 500 to keep the in-memory
      // sort bounded — beyond that, a denormalized job_count column or
      // RPC becomes the right move.
      query = query.limit(500)
    } else {
      if (options.limit) {
        query = query.limit(options.limit)
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 25) - 1)
      }
    }

    const { data, error } = await query
    if (error) throw new Error(`Failed to list properties: ${error.message}`)

    const mapped: PropertyWithCounts[] = (data || []).map((row) => {
      const contacts = Array.isArray((row as Record<string, unknown>).property_contacts)
        ? ((row as Record<string, unknown>).property_contacts as Array<{ is_current: boolean }>)
        : []
      const jobs = Array.isArray((row as Record<string, unknown>).jobs)
        ? ((row as Record<string, unknown>).jobs as unknown[])
        : []
      const rest = { ...(row as Record<string, unknown>) }
      delete rest.property_contacts
      delete rest.jobs
      return {
        ...(rest as Property),
        current_contact_count: contacts.filter((c) => c.is_current).length,
        past_contact_count: contacts.filter((c) => !c.is_current).length,
        job_count: jobs.length,
      }
    })

    if (sortBy === 'jobs') {
      const dir = sortDir === 'asc' ? 1 : -1
      mapped.sort((a, b) => {
        const delta = (a.job_count - b.job_count) * dir
        if (delta !== 0) return delta
        // Tiebreak on address so ordering is stable within the same count.
        return (a.address_line1 || '').localeCompare(b.address_line1 || '')
      })
      const offset = options.offset ?? 0
      const limit = options.limit ?? 25
      return mapped.slice(offset, offset + limit)
    }

    return mapped
  }

  static async getProperty(id: string): Promise<Property | null> {
    const { data, error } = await this.supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to fetch property: ${error.message}`)
    }
    return data
  }

  static async getPropertyHistory(id: string): Promise<PropertyHistory | null> {
    const property = await this.getProperty(id)
    if (!property) return null

    const [contactsRes, surveysRes, oppsRes, jobsRes] = await Promise.all([
      this.supabase
        .from('property_contacts')
        .select(
          'id, organization_id, property_id, contact_id, role, is_current, moved_in_date, moved_out_date, notes, created_by, created_at, updated_at, contact:customers!contact_id(id, name, first_name, last_name, email, phone, mobile_phone)',
        )
        .eq('property_id', id)
        .order('is_current', { ascending: false })
        .order('moved_out_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: true }),
      this.supabase
        .from('site_surveys')
        .select('id, job_name, hazard_type, status, created_at, scheduled_date')
        .eq('property_id', id)
        .order('created_at', { ascending: false }),
      this.supabase
        .from('opportunities')
        .select('id, name, opportunity_status, estimated_value, created_at')
        .eq('property_id', id)
        .order('created_at', { ascending: false }),
      this.supabase
        .from('jobs')
        .select('id, job_number, status, created_at, scheduled_start_date')
        .eq('property_id', id)
        .order('created_at', { ascending: false }),
    ])

    if (contactsRes.error) throw new Error(`Failed to load property contacts: ${contactsRes.error.message}`)
    if (surveysRes.error) throw new Error(`Failed to load property surveys: ${surveysRes.error.message}`)
    if (oppsRes.error) throw new Error(`Failed to load property opportunities: ${oppsRes.error.message}`)
    if (jobsRes.error) throw new Error(`Failed to load property jobs: ${jobsRes.error.message}`)

    return {
      property,
      contacts: (contactsRes.data || []) as unknown as PropertyContactWithContact[],
      site_surveys: surveysRes.data || [],
      opportunities: (oppsRes.data || []) as unknown as PropertyHistory['opportunities'],
      jobs: jobsRes.data || [],
    }
  }

  static async createProperty(input: PropertyInsert): Promise<Property> {
    const { data, error } = await this.supabase
      .from('properties')
      .insert([input])
      .select()
      .single()

    if (error) throw new Error(`Failed to create property: ${error.message}`)
    return data
  }

  static async updateProperty(id: string, updates: PropertyUpdate): Promise<Property> {
    const { data, error } = await this.supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update property: ${error.message}`)
    return data
  }

  static async deleteProperty(id: string): Promise<void> {
    const { error } = await this.supabase.from('properties').delete().eq('id', id)
    if (error) throw new Error(`Failed to delete property: ${error.message}`)
  }

  static async addPropertyContact(input: PropertyContactInsert): Promise<PropertyContact> {
    const { data, error } = await this.supabase
      .from('property_contacts')
      .insert([input])
      .select()
      .single()

    if (error) throw new Error(`Failed to add property contact: ${error.message}`)
    return data
  }

  static async updatePropertyContact(id: string, updates: PropertyContactUpdate): Promise<PropertyContact> {
    const { data, error } = await this.supabase
      .from('property_contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update property contact: ${error.message}`)
    return data
  }

  // Marks a contact as having moved out: the trigger flips is_current and
  // role (owner → previous_owner) automatically.
  static async markContactMovedOut(
    id: string,
    movedOutDate: string,
    notes?: string,
  ): Promise<PropertyContact> {
    return this.updatePropertyContact(id, {
      moved_out_date: movedOutDate,
      notes: notes ?? null,
    })
  }

  static async removePropertyContact(id: string): Promise<void> {
    const { error } = await this.supabase.from('property_contacts').delete().eq('id', id)
    if (error) throw new Error(`Failed to remove property contact: ${error.message}`)
  }
}
