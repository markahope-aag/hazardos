import { createClient } from '@/lib/supabase/server';
import type { CustomerSegment, SegmentRule } from '@/types/integrations';
import { MailchimpService } from './mailchimp-service';
import { HubSpotService } from './hubspot-service';
import { createServiceLogger, formatError } from '@/lib/utils/logger';

const log = createServiceLogger('SegmentationService');

export interface CreateSegmentInput {
  name: string;
  description?: string;
  segment_type: 'dynamic' | 'static';
  rules?: SegmentRule[];
  customer_ids?: string[]; // For static segments
}

export interface UpdateSegmentInput {
  name?: string;
  description?: string;
  rules?: SegmentRule[];
  is_active?: boolean;
}

// Map segment fields to actual database columns/queries
const FIELD_MAP: Record<string, { table: string; column: string; type: 'direct' | 'aggregate' }> = {
  // Direct customer fields
  'email': { table: 'customers', column: 'email', type: 'direct' },
  'phone': { table: 'customers', column: 'phone', type: 'direct' },
  'company_name': { table: 'customers', column: 'company_name', type: 'direct' },
  'city': { table: 'customers', column: 'city', type: 'direct' },
  'state': { table: 'customers', column: 'state', type: 'direct' },
  'zip': { table: 'customers', column: 'zip', type: 'direct' },
  'status': { table: 'customers', column: 'status', type: 'direct' },
  'customer_type': { table: 'customers', column: 'customer_type', type: 'direct' },
  'lead_source': { table: 'customers', column: 'lead_source', type: 'direct' },
  'created_at': { table: 'customers', column: 'created_at', type: 'direct' },

  // Aggregate fields (computed from related tables)
  'total_revenue': { table: 'invoices', column: 'SUM(amount)', type: 'aggregate' },
  'job_count': { table: 'jobs', column: 'COUNT(*)', type: 'aggregate' },
  'last_job_date': { table: 'jobs', column: 'MAX(scheduled_date)', type: 'aggregate' },
  'avg_job_value': { table: 'invoices', column: 'AVG(amount)', type: 'aggregate' },
};

export class SegmentationService {
  // ========== CRUD OPERATIONS ==========

  static async list(organizationId: string): Promise<CustomerSegment[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('customer_segments')
      .select('id, organization_id, name, description, segment_type, rules, member_count, is_active, last_calculated_at, mailchimp_tag_id, mailchimp_synced_at, hubspot_synced_at, created_by, created_at, updated_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async get(segmentId: string): Promise<CustomerSegment | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('customer_segments')
      .select('id, organization_id, name, description, segment_type, rules, member_count, is_active, last_calculated_at, mailchimp_tag_id, mailchimp_synced_at, hubspot_synced_at, created_by, created_at, updated_at')
      .eq('id', segmentId)
      .single();

    if (error) throw error;
    return data;
  }

  static async create(
    organizationId: string,
    userId: string,
    input: CreateSegmentInput
  ): Promise<CustomerSegment> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('customer_segments')
      .insert({
        organization_id: organizationId,
        name: input.name,
        description: input.description,
        segment_type: input.segment_type,
        rules: input.rules || [],
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    // For static segments, add initial members
    if (input.segment_type === 'static' && input.customer_ids?.length) {
      const members = input.customer_ids.map(customerId => ({
        segment_id: data.id,
        customer_id: customerId,
        added_by: userId,
      }));

      await supabase.from('segment_members').insert(members);
    }

    // Calculate initial member count
    await this.calculateMembers(data.id);

    return data;
  }

  static async update(
    segmentId: string,
    input: UpdateSegmentInput
  ): Promise<CustomerSegment> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('customer_segments')
      .update({
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.rules && { rules: input.rules }),
        ...(input.is_active !== undefined && { is_active: input.is_active }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', segmentId)
      .select()
      .single();

    if (error) throw error;

    // Recalculate members if rules changed
    if (input.rules) {
      await this.calculateMembers(segmentId);
    }

    return data;
  }

  static async delete(segmentId: string): Promise<void> {
    const supabase = await createClient();

    // Cascade delete handles segment_members
    const { error } = await supabase
      .from('customer_segments')
      .delete()
      .eq('id', segmentId);

    if (error) throw error;
  }

  // ========== MEMBER MANAGEMENT ==========

  static async addMembers(
    segmentId: string,
    customerIds: string[],
    userId: string
  ): Promise<void> {
    const supabase = await createClient();

    const members = customerIds.map(customerId => ({
      segment_id: segmentId,
      customer_id: customerId,
      added_by: userId,
    }));

    await supabase.from('segment_members').upsert(members, {
      onConflict: 'segment_id,customer_id',
    });

    await this.updateMemberCount(segmentId);
  }

  static async removeMembers(segmentId: string, customerIds: string[]): Promise<void> {
    const supabase = await createClient();

    await supabase
      .from('segment_members')
      .delete()
      .eq('segment_id', segmentId)
      .in('customer_id', customerIds);

    await this.updateMemberCount(segmentId);
  }

  static async getMembers(segmentId: string): Promise<Array<{ customer_id: string }>> {
    const supabase = await createClient();

    // Get segment type
    const { data: segment } = await supabase
      .from('customer_segments')
      .select('segment_type, rules, organization_id')
      .eq('id', segmentId)
      .single();

    if (!segment) throw new Error('Segment not found');

    if (segment.segment_type === 'static') {
      // Return static members
      const { data } = await supabase
        .from('segment_members')
        .select('customer_id')
        .eq('segment_id', segmentId);

      return data || [];
    } else {
      // Calculate dynamic members
      return this.evaluateRules(segment.organization_id, segment.rules as SegmentRule[]);
    }
  }

  // ========== MEMBER CALCULATION ==========

  static async calculateMembers(segmentId: string): Promise<number> {
    const supabase = await createClient();

    const { data: segment } = await supabase
      .from('customer_segments')
      .select('id, organization_id, segment_type, rules')
      .eq('id', segmentId)
      .single();

    if (!segment) throw new Error('Segment not found');

    let memberCount: number;

    if (segment.segment_type === 'static') {
      // Count static members
      const { count } = await supabase
        .from('segment_members')
        .select('*', { count: 'exact', head: true })
        .eq('segment_id', segmentId);

      memberCount = count || 0;
    } else {
      // Evaluate dynamic rules
      const members = await this.evaluateRules(
        segment.organization_id,
        segment.rules as SegmentRule[]
      );
      memberCount = members.length;
    }

    // Update segment with count
    await supabase
      .from('customer_segments')
      .update({
        member_count: memberCount,
        last_calculated_at: new Date().toISOString(),
      })
      .eq('id', segmentId);

    return memberCount;
  }

  private static async updateMemberCount(segmentId: string): Promise<void> {
    const supabase = await createClient();

    const { count } = await supabase
      .from('segment_members')
      .select('*', { count: 'exact', head: true })
      .eq('segment_id', segmentId);

    await supabase
      .from('customer_segments')
      .update({
        member_count: count || 0,
        last_calculated_at: new Date().toISOString(),
      })
      .eq('id', segmentId);
  }

  private static async evaluateRules(
    organizationId: string,
    rules: SegmentRule[]
  ): Promise<Array<{ customer_id: string }>> {
    const supabase = await createClient();

    if (!rules.length) {
      // No rules = all customers
      const { data } = await supabase
        .from('customers')
        .select('id')
        .eq('organization_id', organizationId);

      return (data || []).map(c => ({ customer_id: c.id }));
    }

    // Build query based on rules
    // For simplicity, we'll evaluate direct fields using Supabase query builder
    // and handle aggregate fields separately

    const directRules = rules.filter(r => {
      const field = FIELD_MAP[r.field];
      return field && field.type === 'direct';
    });

    const aggregateRules = rules.filter(r => {
      const field = FIELD_MAP[r.field];
      return field && field.type === 'aggregate';
    });

    // Start with direct field filtering
    let query = supabase
      .from('customers')
      .select('id')
      .eq('organization_id', organizationId);

    for (const rule of directRules) {
      const field = FIELD_MAP[rule.field];
      if (!field) continue;

      switch (rule.operator) {
        case '=':
          query = query.eq(field.column, rule.value);
          break;
        case '!=':
          query = query.neq(field.column, rule.value);
          break;
        case '>':
          query = query.gt(field.column, rule.value);
          break;
        case '<':
          query = query.lt(field.column, rule.value);
          break;
        case '>=':
          query = query.gte(field.column, rule.value);
          break;
        case '<=':
          query = query.lte(field.column, rule.value);
          break;
        case 'contains':
          query = query.ilike(field.column, `%${rule.value}%`);
          break;
        case 'not_contains':
          query = query.not(field.column, 'ilike', `%${rule.value}%`);
          break;
        case 'starts_with':
          query = query.ilike(field.column, `${rule.value}%`);
          break;
        case 'ends_with':
          query = query.ilike(field.column, `%${rule.value}`);
          break;
        case 'is_null':
          query = query.is(field.column, null);
          break;
        case 'is_not_null':
          query = query.not(field.column, 'is', null);
          break;
      }
    }

    const { data: directMatches } = await query;
    let customerIds = (directMatches || []).map(c => c.id);

    // Handle aggregate rules
    if (aggregateRules.length > 0 && customerIds.length > 0) {
      for (const rule of aggregateRules) {
        customerIds = await this.filterByAggregate(customerIds, rule);
      }
    }

    return customerIds.map(id => ({ customer_id: id }));
  }

  private static async filterByAggregate(
    customerIds: string[],
    rule: SegmentRule
  ): Promise<string[]> {
    const supabase = await createClient();
    const filtered: string[] = [];

    for (const customerId of customerIds) {
      let value: number | string | null = null;

      switch (rule.field) {
        case 'total_revenue': {
          const { data } = await supabase
            .from('invoices')
            .select('amount')
            .eq('customer_id', customerId);
          value = (data || []).reduce((sum, inv) => sum + (inv.amount || 0), 0);
          break;
        }
        case 'job_count': {
          const { count } = await supabase
            .from('jobs')
            .select('*', { count: 'exact', head: true })
            .eq('customer_id', customerId);
          value = count || 0;
          break;
        }
        case 'last_job_date': {
          const { data } = await supabase
            .from('jobs')
            .select('scheduled_date')
            .eq('customer_id', customerId)
            .order('scheduled_date', { ascending: false })
            .limit(1)
            .maybeSingle();
          value = data?.scheduled_date || null;
          break;
        }
        case 'avg_job_value': {
          const { data } = await supabase
            .from('invoices')
            .select('amount')
            .eq('customer_id', customerId);
          const amounts = (data || []).map(inv => inv.amount || 0);
          value = amounts.length ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
          break;
        }
      }

      // Evaluate the rule
      if (this.evaluateCondition(value, rule.operator, rule.value)) {
        filtered.push(customerId);
      }
    }

    return filtered;
  }

  private static evaluateCondition(
    actual: number | string | null,
    operator: string,
    expected: unknown
  ): boolean {
    if (operator === 'is_null') return actual === null;
    if (operator === 'is_not_null') return actual !== null;
    if (actual === null) return false;

    const numActual = typeof actual === 'number' ? actual : parseFloat(actual);
    const numExpected = typeof expected === 'number' ? expected : parseFloat(expected as string);

    switch (operator) {
      case '=':
        return actual === expected || numActual === numExpected;
      case '!=':
        return actual !== expected && numActual !== numExpected;
      case '>':
        return numActual > numExpected;
      case '<':
        return numActual < numExpected;
      case '>=':
        return numActual >= numExpected;
      case '<=':
        return numActual <= numExpected;
      default:
        return false;
    }
  }

  // ========== MARKETING SYNC ==========

  static async syncToMailchimp(segmentId: string, listId: string): Promise<void> {
    const supabase = await createClient();

    const { data: segment } = await supabase
      .from('customer_segments')
      .select('*, organization_id')
      .eq('id', segmentId)
      .single();

    if (!segment) throw new Error('Segment not found');

    // Get members
    const members = await this.getMembers(segmentId);

    // Get customer emails
    const { data: customers } = await supabase
      .from('customers')
      .select('id, email')
      .in('id', members.map(m => m.customer_id))
      .not('email', 'is', null);

    // Sync each customer and add tag
    const tagName = `Segment: ${segment.name}`;

    for (const customer of customers || []) {
      try {
        await MailchimpService.syncContact(segment.organization_id, customer.id, listId);
        await MailchimpService.addTagToContact(
          segment.organization_id,
          listId,
          customer.email,
          tagName
        );
      } catch (error) {
        log.error(
          { 
            error: formatError(error, 'MAILCHIMP_SYNC_ERROR'),
            customerId: customer.id,
            segmentId: segment.id
          },
          'Failed to sync customer to Mailchimp'
        );
      }
    }

    // Update segment sync status
    await supabase
      .from('customer_segments')
      .update({
        mailchimp_tag_id: tagName,
        mailchimp_synced_at: new Date().toISOString(),
      })
      .eq('id', segmentId);
  }

  static async syncToHubSpot(segmentId: string): Promise<void> {
    const supabase = await createClient();

    const { data: segment } = await supabase
      .from('customer_segments')
      .select('*, organization_id')
      .eq('id', segmentId)
      .single();

    if (!segment) throw new Error('Segment not found');

    // Get members
    const members = await this.getMembers(segmentId);

    // Get customer emails
    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .in('id', members.map(m => m.customer_id));

    // Sync each customer
    for (const customer of customers || []) {
      try {
        await HubSpotService.syncContact(segment.organization_id, customer.id);
      } catch (error) {
        log.error(
          { 
            error: formatError(error, 'HUBSPOT_SYNC_ERROR'),
            customerId: customer.id,
            segmentId: segment.id
          },
          'Failed to sync customer to HubSpot'
        );
      }
    }

    // Update segment sync status
    await supabase
      .from('customer_segments')
      .update({
        hubspot_synced_at: new Date().toISOString(),
      })
      .eq('id', segmentId);
  }

  // ========== UTILITIES ==========

  static getAvailableFields(): Array<{ value: string; label: string; type: string }> {
    return [
      // Direct fields
      { value: 'email', label: 'Email', type: 'string' },
      { value: 'phone', label: 'Phone', type: 'string' },
      { value: 'company_name', label: 'Company Name', type: 'string' },
      { value: 'city', label: 'City', type: 'string' },
      { value: 'state', label: 'State', type: 'string' },
      { value: 'zip', label: 'ZIP Code', type: 'string' },
      { value: 'status', label: 'Status', type: 'string' },
      { value: 'customer_type', label: 'Customer Type', type: 'string' },
      { value: 'lead_source', label: 'Lead Source', type: 'string' },
      { value: 'created_at', label: 'Created Date', type: 'date' },
      // Aggregate fields
      { value: 'total_revenue', label: 'Total Revenue', type: 'number' },
      { value: 'job_count', label: 'Number of Jobs', type: 'number' },
      { value: 'last_job_date', label: 'Last Job Date', type: 'date' },
      { value: 'avg_job_value', label: 'Average Job Value', type: 'number' },
    ];
  }

  static getOperatorsForType(fieldType: string): Array<{ value: string; label: string }> {
    const baseOperators = [
      { value: '=', label: 'equals' },
      { value: '!=', label: 'does not equal' },
      { value: 'is_null', label: 'is empty' },
      { value: 'is_not_null', label: 'is not empty' },
    ];

    switch (fieldType) {
      case 'string':
        return [
          ...baseOperators,
          { value: 'contains', label: 'contains' },
          { value: 'not_contains', label: 'does not contain' },
          { value: 'starts_with', label: 'starts with' },
          { value: 'ends_with', label: 'ends with' },
        ];
      case 'number':
        return [
          ...baseOperators,
          { value: '>', label: 'greater than' },
          { value: '<', label: 'less than' },
          { value: '>=', label: 'greater than or equal' },
          { value: '<=', label: 'less than or equal' },
        ];
      case 'date':
        return [
          ...baseOperators,
          { value: '>', label: 'after' },
          { value: '<', label: 'before' },
          { value: '>=', label: 'on or after' },
          { value: '<=', label: 'on or before' },
        ];
      default:
        return baseOperators;
    }
  }
}
