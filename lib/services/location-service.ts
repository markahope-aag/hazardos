import { createClient } from '@/lib/supabase/server';
import type { Location, LocationUser } from '@/types/integrations';

export interface CreateLocationInput {
  name: string;
  code?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  is_headquarters?: boolean;
}

export interface UpdateLocationInput {
  name?: string;
  code?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  is_headquarters?: boolean;
  is_active?: boolean;
}

export class LocationService {
  // ========== CRUD OPERATIONS ==========

  static async list(organizationId: string): Promise<Location[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('is_headquarters', { ascending: false })
      .order('name');

    if (error) throw error;
    return data || [];
  }

  static async get(locationId: string): Promise<Location | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('id', locationId)
      .single();

    if (error) throw error;
    return data;
  }

  static async create(
    organizationId: string,
    input: CreateLocationInput
  ): Promise<Location> {
    const supabase = await createClient();

    // If this is headquarters, unset any existing headquarters
    if (input.is_headquarters) {
      await supabase
        .from('locations')
        .update({ is_headquarters: false })
        .eq('organization_id', organizationId)
        .eq('is_headquarters', true);
    }

    const { data, error } = await supabase
      .from('locations')
      .insert({
        organization_id: organizationId,
        name: input.name,
        code: input.code,
        address_line1: input.address_line1,
        address_line2: input.address_line2,
        city: input.city,
        state: input.state,
        zip: input.zip,
        country: input.country || 'US',
        phone: input.phone,
        email: input.email,
        timezone: input.timezone || 'America/New_York',
        is_headquarters: input.is_headquarters || false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async update(
    locationId: string,
    input: UpdateLocationInput
  ): Promise<Location> {
    const supabase = await createClient();

    // If setting as headquarters, unset any existing headquarters
    if (input.is_headquarters) {
      const { data: location } = await supabase
        .from('locations')
        .select('organization_id')
        .eq('id', locationId)
        .single();

      if (location) {
        await supabase
          .from('locations')
          .update({ is_headquarters: false })
          .eq('organization_id', location.organization_id)
          .eq('is_headquarters', true)
          .neq('id', locationId);
      }
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.code !== undefined) updateData.code = input.code;
    if (input.address_line1 !== undefined) updateData.address_line1 = input.address_line1;
    if (input.address_line2 !== undefined) updateData.address_line2 = input.address_line2;
    if (input.city !== undefined) updateData.city = input.city;
    if (input.state !== undefined) updateData.state = input.state;
    if (input.zip !== undefined) updateData.zip = input.zip;
    if (input.country !== undefined) updateData.country = input.country;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.timezone !== undefined) updateData.timezone = input.timezone;
    if (input.is_headquarters !== undefined) updateData.is_headquarters = input.is_headquarters;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabase
      .from('locations')
      .update(updateData)
      .eq('id', locationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(locationId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', locationId);

    if (error) throw error;
  }

  // ========== USER ASSIGNMENTS ==========

  static async getLocationUsers(locationId: string): Promise<Array<LocationUser & { user?: { email: string; full_name?: string } }>> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('location_users')
      .select(`
        *,
        user:profiles(email, full_name)
      `)
      .eq('location_id', locationId);

    if (error) throw error;
    return data || [];
  }

  static async assignUser(
    locationId: string,
    userId: string,
    assignedBy: string,
    options: { is_primary?: boolean; can_manage?: boolean } = {}
  ): Promise<void> {
    const supabase = await createClient();

    // If setting as primary, unset any existing primary for this user
    if (options.is_primary) {
      await supabase
        .from('location_users')
        .update({ is_primary: false })
        .eq('user_id', userId)
        .eq('is_primary', true);
    }

    await supabase
      .from('location_users')
      .upsert({
        location_id: locationId,
        user_id: userId,
        is_primary: options.is_primary || false,
        can_manage: options.can_manage || false,
        assigned_by: assignedBy,
      }, {
        onConflict: 'location_id,user_id',
      });
  }

  static async unassignUser(locationId: string, userId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('location_users')
      .delete()
      .eq('location_id', locationId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  static async getUserLocations(userId: string): Promise<Array<Location & { is_primary: boolean; can_manage: boolean }>> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('location_users')
      .select(`
        is_primary,
        can_manage,
        location:locations(*)
      `)
      .eq('user_id', userId);

    if (error) throw error;

    return (data || []).map(item => {
      const location = item.location as unknown as Location;
      return {
        ...location,
        is_primary: item.is_primary,
        can_manage: item.can_manage,
      };
    });
  }

  static async setUserPrimaryLocation(userId: string, locationId: string): Promise<void> {
    const supabase = await createClient();

    // Unset any existing primary
    await supabase
      .from('location_users')
      .update({ is_primary: false })
      .eq('user_id', userId);

    // Set new primary
    await supabase
      .from('location_users')
      .update({ is_primary: true })
      .eq('user_id', userId)
      .eq('location_id', locationId);

    // Also update profile's default location
    await supabase
      .from('profiles')
      .update({ default_location_id: locationId })
      .eq('id', userId);
  }

  // ========== UTILITIES ==========

  static getTimezones(): Array<{ value: string; label: string }> {
    return [
      { value: 'America/New_York', label: 'Eastern Time (ET)' },
      { value: 'America/Chicago', label: 'Central Time (CT)' },
      { value: 'America/Denver', label: 'Mountain Time (MT)' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
      { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
      { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
      { value: 'America/Phoenix', label: 'Arizona (no DST)' },
    ];
  }
}
