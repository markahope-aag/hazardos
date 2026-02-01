import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';
import type { WhiteLabelConfig, CustomDomain } from '@/types/integrations';

export interface UpdateWhiteLabelInput {
  white_label_enabled?: boolean;
  config?: WhiteLabelConfig;
}

export class WhiteLabelService {
  // ========== WHITE-LABEL CONFIG ==========

  static async getConfig(organizationId: string): Promise<{
    enabled: boolean;
    config: WhiteLabelConfig;
  }> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('organizations')
      .select('white_label_enabled, white_label_config')
      .eq('id', organizationId)
      .single();

    if (error) throw error;

    return {
      enabled: data?.white_label_enabled || false,
      config: (data?.white_label_config as WhiteLabelConfig) || {},
    };
  }

  static async updateConfig(
    organizationId: string,
    input: UpdateWhiteLabelInput
  ): Promise<void> {
    const supabase = await createClient();

    const updateData: Record<string, unknown> = {};

    if (input.white_label_enabled !== undefined) {
      updateData.white_label_enabled = input.white_label_enabled;
    }

    if (input.config !== undefined) {
      // Merge with existing config
      const { data: existing } = await supabase
        .from('organizations')
        .select('white_label_config')
        .eq('id', organizationId)
        .single();

      updateData.white_label_config = {
        ...((existing?.white_label_config as object) || {}),
        ...input.config,
      };
    }

    const { error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId);

    if (error) throw error;
  }

  // ========== CUSTOM DOMAINS ==========

  static async listDomains(organizationId: string): Promise<CustomDomain[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('custom_domains')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async addDomain(organizationId: string, domain: string): Promise<CustomDomain> {
    const supabase = await createClient();

    // Generate verification token
    const verificationToken = randomBytes(32).toString('hex');

    // Generate expected DNS records
    const dnsRecords = [
      {
        type: 'CNAME',
        name: domain,
        value: `${organizationId}.hazardos.com`,
      },
      {
        type: 'TXT',
        name: `_hazardos.${domain}`,
        value: `hazardos-verification=${verificationToken}`,
      },
    ];

    const { data, error } = await supabase
      .from('custom_domains')
      .insert({
        organization_id: organizationId,
        domain,
        verification_token: verificationToken,
        dns_records: dnsRecords,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async verifyDomain(domainId: string): Promise<{ verified: boolean; error?: string }> {
    const supabase = await createClient();

    const { data: domain } = await supabase
      .from('custom_domains')
      .select('*')
      .eq('id', domainId)
      .single();

    if (!domain) {
      return { verified: false, error: 'Domain not found' };
    }

    // Check DNS records
    // In production, this would actually verify DNS records
    // For now, we'll simulate verification

    try {
      // Simulate DNS lookup
      const isVerified = await this.checkDnsRecords(domain.domain, domain.verification_token);

      if (isVerified) {
        await supabase
          .from('custom_domains')
          .update({
            is_verified: true,
            verified_at: new Date().toISOString(),
            ssl_status: 'provisioning',
          })
          .eq('id', domainId);

        return { verified: true };
      } else {
        return { verified: false, error: 'DNS records not found' };
      }
    } catch (error) {
      return { verified: false, error: 'DNS lookup failed' };
    }
  }

  private static async checkDnsRecords(
    _domain: string,
    _verificationToken: string
  ): Promise<boolean> {
    // In production, this would use a DNS library to check records
    // For now, return false to simulate unverified state
    return false;
  }

  static async removeDomain(domainId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('custom_domains')
      .delete()
      .eq('id', domainId);

    if (error) throw error;
  }

  // ========== BRANDING HELPERS ==========

  static getDefaultConfig(): WhiteLabelConfig {
    return {
      company_name: 'HazardOS',
      primary_color: '#3b82f6',
      secondary_color: '#1e40af',
      hide_powered_by: false,
    };
  }

  static validateConfig(config: WhiteLabelConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.primary_color && !this.isValidColor(config.primary_color)) {
      errors.push('Invalid primary color format');
    }

    if (config.secondary_color && !this.isValidColor(config.secondary_color)) {
      errors.push('Invalid secondary color format');
    }

    if (config.logo_url && !this.isValidUrl(config.logo_url)) {
      errors.push('Invalid logo URL');
    }

    if (config.favicon_url && !this.isValidUrl(config.favicon_url)) {
      errors.push('Invalid favicon URL');
    }

    return { valid: errors.length === 0, errors };
  }

  private static isValidColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
