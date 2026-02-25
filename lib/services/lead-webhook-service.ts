import { createClient } from '@/lib/supabase/server';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { LeadWebhookEndpoint, LeadProvider } from '@/types/integrations';
import { logger, formatError } from '@/lib/utils/logger';

export interface CreateEndpointInput {
  name: string;
  slug: string;
  provider: LeadProvider;
  api_key?: string;
  secret?: string;
  field_mapping?: Record<string, string>;
}

export interface UpdateEndpointInput {
  name?: string;
  api_key?: string;
  secret?: string;
  field_mapping?: Record<string, string>;
  is_active?: boolean;
}

interface ParsedLead {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  lead_source?: string;
  hazard_types?: string[];
}

// Default field mappings for known providers
const PROVIDER_MAPPINGS: Record<LeadProvider, Record<string, string>> = {
  homeadvisor: {
    'lead.firstName': 'first_name',
    'lead.lastName': 'last_name',
    'lead.email': 'email',
    'lead.phone': 'phone',
    'lead.address.street': 'address_line1',
    'lead.address.city': 'city',
    'lead.address.state': 'state',
    'lead.address.zip': 'zip',
    'lead.description': 'notes',
  },
  thumbtack: {
    'customer.name': 'full_name',
    'customer.email': 'email',
    'customer.phone': 'phone',
    'location.street_address': 'address_line1',
    'location.city': 'city',
    'location.state': 'state',
    'location.postal_code': 'zip',
    'request.description': 'notes',
  },
  angi: {
    'consumer.firstName': 'first_name',
    'consumer.lastName': 'last_name',
    'consumer.email': 'email',
    'consumer.phone': 'phone',
    'address.streetAddress': 'address_line1',
    'address.city': 'city',
    'address.state': 'state',
    'address.postalCode': 'zip',
    'projectDescription': 'notes',
  },
  custom: {},
};

export class LeadWebhookService {
  // ========== CRUD OPERATIONS ==========

  static async list(organizationId: string): Promise<LeadWebhookEndpoint[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('lead_webhook_endpoints')
      .select('id, organization_id, name, slug, provider, api_key, secret, field_mapping, is_active, leads_received, last_lead_at, created_at, updated_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async get(endpointId: string): Promise<LeadWebhookEndpoint | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('lead_webhook_endpoints')
      .select('id, organization_id, name, slug, provider, api_key, secret, field_mapping, is_active, leads_received, last_lead_at, created_at, updated_at')
      .eq('id', endpointId)
      .single();

    if (error) throw error;
    return data;
  }

  static async getBySlug(slug: string): Promise<LeadWebhookEndpoint | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('lead_webhook_endpoints')
      .select('id, organization_id, name, slug, provider, api_key, secret, field_mapping, is_active, leads_received, last_lead_at, created_at, updated_at')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async create(
    organizationId: string,
    input: CreateEndpointInput
  ): Promise<LeadWebhookEndpoint> {
    const supabase = await createClient();

    // Get default mapping for provider
    const defaultMapping = PROVIDER_MAPPINGS[input.provider] || {};
    const fieldMapping = { ...defaultMapping, ...input.field_mapping };

    const { data, error } = await supabase
      .from('lead_webhook_endpoints')
      .insert({
        organization_id: organizationId,
        name: input.name,
        slug: input.slug,
        provider: input.provider,
        api_key: input.api_key,
        secret: input.secret,
        field_mapping: fieldMapping,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async update(
    endpointId: string,
    input: UpdateEndpointInput
  ): Promise<LeadWebhookEndpoint> {
    const supabase = await createClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.api_key !== undefined) updateData.api_key = input.api_key;
    if (input.secret !== undefined) updateData.secret = input.secret;
    if (input.field_mapping !== undefined) updateData.field_mapping = input.field_mapping;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabase
      .from('lead_webhook_endpoints')
      .update(updateData)
      .eq('id', endpointId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(endpointId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('lead_webhook_endpoints')
      .delete()
      .eq('id', endpointId);

    if (error) throw error;
  }

  // ========== LEAD PROCESSING ==========

  static async processLead(
    endpoint: LeadWebhookEndpoint,
    payload: Record<string, unknown>,
    headers: Record<string, string>,
    ipAddress?: string
  ): Promise<{ success: boolean; customerId?: string; error?: string }> {
    const supabase = await createClient();

    try {
      // Verify authentication if configured
      if (endpoint.api_key) {
        const authHeader = headers['authorization'] || headers['x-api-key'];
        if (!authHeader || !authHeader.includes(endpoint.api_key)) {
          return this.logAndReturn(endpoint, payload, headers, ipAddress, 'failed', 'Invalid API key');
        }
      }

      if (endpoint.secret) {
        const signature = headers['x-signature'] || headers['x-webhook-signature'];
        if (!this.verifySignature(payload, endpoint.secret, signature)) {
          return this.logAndReturn(endpoint, payload, headers, ipAddress, 'failed', 'Invalid signature');
        }
      }

      // Parse lead data using field mapping
      const leadData = this.parseLead(payload, endpoint.field_mapping as Record<string, string>);

      // Check for duplicate (same email within last 24 hours)
      if (leadData.email) {
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('organization_id', endpoint.organization_id)
          .eq('email', leadData.email)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle();

        if (existing) {
          return this.logAndReturn(endpoint, payload, headers, ipAddress, 'duplicate', 'Duplicate lead', existing.id);
        }
      }

      // Create customer
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          organization_id: endpoint.organization_id,
          first_name: leadData.first_name,
          last_name: leadData.last_name,
          email: leadData.email,
          phone: leadData.phone,
          company_name: leadData.company_name,
          address_line1: leadData.address_line1,
          city: leadData.city,
          state: leadData.state,
          zip: leadData.zip,
          notes: leadData.notes,
          lead_source: endpoint.provider,
          status: 'lead',
        })
        .select('id')
        .single();

      if (customerError) throw customerError;

      // Create opportunity if enabled in org settings
      let opportunityId: string | undefined;
      const opportunityResult = await this.createOpportunityFromLead(
        endpoint.organization_id,
        customer.id,
        leadData,
        endpoint.provider
      );
      if (opportunityResult) {
        opportunityId = opportunityResult.id;
      }

      // Update endpoint stats
      await supabase
        .from('lead_webhook_endpoints')
        .update({
          leads_received: endpoint.leads_received + 1,
          last_lead_at: new Date().toISOString(),
        })
        .eq('id', endpoint.id);

      // Log success
      await this.logLead(
        endpoint,
        payload,
        headers,
        ipAddress,
        'success',
        null,
        customer.id,
        opportunityId
      );

      return { success: true, customerId: customer.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.logAndReturn(endpoint, payload, headers, ipAddress, 'failed', errorMessage);
    }
  }

  private static async logAndReturn(
    endpoint: LeadWebhookEndpoint,
    payload: Record<string, unknown>,
    headers: Record<string, string>,
    ipAddress: string | undefined,
    status: 'success' | 'failed' | 'duplicate',
    errorMessage: string | null,
    customerId?: string
  ): Promise<{ success: boolean; customerId?: string; error?: string }> {
    await this.logLead(endpoint, payload, headers, ipAddress, status, errorMessage, customerId);

    return {
      success: status === 'success' || status === 'duplicate',
      customerId,
      error: errorMessage || undefined,
    };
  }

  private static async logLead(
    endpoint: LeadWebhookEndpoint,
    payload: Record<string, unknown>,
    headers: Record<string, string>,
    ipAddress: string | undefined,
    status: 'success' | 'failed' | 'duplicate',
    errorMessage: string | null,
    customerId?: string,
    opportunityId?: string
  ): Promise<void> {
    const supabase = await createClient();

    await supabase.from('lead_webhook_log').insert({
      endpoint_id: endpoint.id,
      organization_id: endpoint.organization_id,
      raw_payload: payload,
      headers,
      ip_address: ipAddress,
      status,
      error_message: errorMessage,
      customer_id: customerId,
      opportunity_id: opportunityId,
    });
  }

  // ========== PARSING ==========

  private static parseLead(
    payload: Record<string, unknown>,
    fieldMapping: Record<string, string>
  ): ParsedLead {
    const lead: ParsedLead = {
      lead_source: 'webhook',
    };

    for (const [sourcePath, targetField] of Object.entries(fieldMapping)) {
      const value = this.getNestedValue(payload, sourcePath);
      if (value !== undefined && value !== null && value !== '') {
        if (targetField === 'full_name') {
          // Split full name into first/last
          const parts = String(value).trim().split(/\s+/);
          lead.first_name = parts[0];
          lead.last_name = parts.slice(1).join(' ') || undefined;
        } else {
          (lead as Record<string, unknown>)[targetField] = String(value);
        }
      }
    }

    return lead;
  }

  private static getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private static verifySignature(
    payload: Record<string, unknown>,
    secret: string,
    signature: string | undefined
  ): boolean {
    if (!signature) return false;

    const body = JSON.stringify(payload);
    const expectedSignature = createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    // Handle both formats: "sha256=xxx" and just "xxx"
    const providedSignature = signature.startsWith('sha256=')
      ? signature.substring(7)
      : signature;

    // Use timing-safe comparison to prevent timing attacks
    try {
      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const providedBuffer = Buffer.from(providedSignature, 'utf8');

      // Signatures must be same length for timingSafeEqual
      if (expectedBuffer.length !== providedBuffer.length) {
        return false;
      }

      return timingSafeEqual(expectedBuffer, providedBuffer);
    } catch {
      return false;
    }
  }

  // ========== OPPORTUNITY CREATION ==========

  /**
   * Creates a pipeline opportunity from a lead if auto-creation is enabled
   */
  private static async createOpportunityFromLead(
    organizationId: string,
    customerId: string,
    leadData: ParsedLead,
    provider: LeadProvider
  ): Promise<{ id: string } | null> {
    const supabase = await createClient();

    try {
      // Check if organization has auto-opportunity creation enabled
      // Look for this setting in the organizations table
      const { data: org } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single();

      // Check if auto-opportunity creation is enabled in org settings
      // Default to true if settings don't exist (opt-out rather than opt-in)
      const settings = org?.settings as Record<string, unknown> | null;
      const autoCreateOpportunity = settings?.auto_create_opportunity_from_lead !== false;

      if (!autoCreateOpportunity) {
        return null;
      }

      // Get the initial "lead" stage for this organization
      const { data: leadStage } = await supabase
        .from('pipeline_stages')
        .select('id, probability')
        .eq('organization_id', organizationId)
        .eq('stage_type', 'lead')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(1)
        .single();

      if (!leadStage) {
        // No lead stage configured - skip opportunity creation
        logger.warn(
          { organizationId },
          'No lead pipeline stage found for organization'
        );
        return null;
      }

      // Build opportunity name from lead data
      const customerName = leadData.company_name ||
        [leadData.first_name, leadData.last_name].filter(Boolean).join(' ') ||
        'New Lead';
      const opportunityName = `${customerName} - ${provider.charAt(0).toUpperCase() + provider.slice(1)} Lead`;

      // Create the opportunity
      const { data: opportunity, error } = await supabase
        .from('opportunities')
        .insert({
          organization_id: organizationId,
          customer_id: customerId,
          name: opportunityName,
          description: leadData.notes || `Lead from ${provider}`,
          stage_id: leadStage.id,
          estimated_value: null, // Will be set when estimate is created
          weighted_value: null,
          expected_close_date: null,
          owner_id: null, // Will be assigned manually or via round-robin
        })
        .select('id')
        .single();

      if (error) {
        logger.error({ error: formatError(error, 'OPPORTUNITY_CREATION_FAILED') }, 'Failed to create opportunity from lead');
        return null;
      }

      return opportunity;
    } catch (error) {
      logger.error({ error: formatError(error, 'OPPORTUNITY_CREATION_ERROR') }, 'Error in createOpportunityFromLead');
      return null;
    }
  }

  // ========== UTILITIES ==========

  static generateSlug(): string {
    return randomBytes(12).toString('base64url');
  }

  static getProviders(): Array<{ value: LeadProvider; label: string }> {
    return [
      { value: 'homeadvisor', label: 'HomeAdvisor' },
      { value: 'thumbtack', label: 'Thumbtack' },
      { value: 'angi', label: 'Angi' },
      { value: 'custom', label: 'Custom' },
    ];
  }
}
