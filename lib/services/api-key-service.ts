import { createClient } from '@/lib/supabase/server';
import { createHash, randomBytes } from 'crypto';
import type { ApiKey, ApiKeyScope } from '@/types/integrations';

export interface CreateApiKeyInput {
  name: string;
  scopes: ApiKeyScope[];
  rate_limit?: number;
  expires_at?: string;
}

export interface UpdateApiKeyInput {
  name?: string;
  scopes?: ApiKeyScope[];
  rate_limit?: number;
  is_active?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  apiKey?: ApiKey;
  organizationId?: string;
  error?: string;
}

export class ApiKeyService {
  // ========== CRUD OPERATIONS ==========

  static async list(organizationId: string): Promise<ApiKey[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('organization_id', organizationId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async get(keyId: string): Promise<ApiKey | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', keyId)
      .single();

    if (error) throw error;
    return data;
  }

  static async create(
    organizationId: string,
    userId: string,
    input: CreateApiKeyInput
  ): Promise<{ key: string; id: string }> {
    const supabase = await createClient();

    // Generate the full key
    const keyRandom = randomBytes(24).toString('base64url');
    const fullKey = `hzd_live_${keyRandom}`;
    const keyPrefix = fullKey.substring(0, 16);

    // Hash the full key for storage
    const keyHash = createHash('sha256').update(fullKey).digest('hex');

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        organization_id: organizationId,
        name: input.name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        scopes: input.scopes,
        rate_limit: input.rate_limit || 1000,
        expires_at: input.expires_at,
        created_by: userId,
      })
      .select('id')
      .single();

    if (error) throw error;

    // Return the full key (this is the only time it's available)
    return { key: fullKey, id: data.id };
  }

  static async update(
    keyId: string,
    input: UpdateApiKeyInput
  ): Promise<ApiKey> {
    const supabase = await createClient();

    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.scopes !== undefined) updateData.scopes = input.scopes;
    if (input.rate_limit !== undefined) updateData.rate_limit = input.rate_limit;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabase
      .from('api_keys')
      .update(updateData)
      .eq('id', keyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async revoke(keyId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('api_keys')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
      })
      .eq('id', keyId);

    if (error) throw error;
  }

  // ========== VALIDATION ==========

  static async validate(apiKey: string): Promise<ValidationResult> {
    const supabase = await createClient();

    // Check format
    if (!apiKey.startsWith('hzd_live_')) {
      return { valid: false, error: 'Invalid key format' };
    }

    // Hash the provided key
    const keyHash = createHash('sha256').update(apiKey).digest('hex');
    const keyPrefix = apiKey.substring(0, 16);

    // Look up by hash
    const { data: key, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('key_prefix', keyPrefix)
      .single();

    if (error || !key) {
      return { valid: false, error: 'Invalid API key' };
    }

    // Check if revoked
    if (key.revoked_at) {
      return { valid: false, error: 'API key has been revoked' };
    }

    // Check if active
    if (!key.is_active) {
      return { valid: false, error: 'API key is inactive' };
    }

    // Check expiration
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return { valid: false, error: 'API key has expired' };
    }

    // Update last used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', key.id);

    return {
      valid: true,
      apiKey: key,
      organizationId: key.organization_id,
    };
  }

  // ========== RATE LIMITING ==========

  static async checkRateLimit(keyId: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const supabase = await createClient();

    const { data: key } = await supabase
      .from('api_keys')
      .select('rate_limit, rate_limit_count, rate_limit_reset_at')
      .eq('id', keyId)
      .single();

    if (!key) {
      return { allowed: false, remaining: 0, resetAt: new Date() };
    }

    const now = new Date();
    const resetAt = key.rate_limit_reset_at ? new Date(key.rate_limit_reset_at) : null;

    // If reset time has passed, reset the counter
    if (!resetAt || resetAt < now) {
      const newResetAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

      await supabase
        .from('api_keys')
        .update({
          rate_limit_count: 1,
          rate_limit_reset_at: newResetAt.toISOString(),
        })
        .eq('id', keyId);

      return {
        allowed: true,
        remaining: key.rate_limit - 1,
        resetAt: newResetAt,
      };
    }

    // Check if over limit
    if (key.rate_limit_count >= key.rate_limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: resetAt,
      };
    }

    // Increment counter
    await supabase
      .from('api_keys')
      .update({
        rate_limit_count: key.rate_limit_count + 1,
      })
      .eq('id', keyId);

    return {
      allowed: true,
      remaining: key.rate_limit - key.rate_limit_count - 1,
      resetAt: resetAt,
    };
  }

  // ========== LOGGING ==========

  static async logRequest(
    keyId: string,
    organizationId: string,
    method: string,
    path: string,
    statusCode: number,
    responseTimeMs?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const supabase = await createClient();

    await supabase.from('api_request_log').insert({
      api_key_id: keyId,
      organization_id: organizationId,
      method,
      path,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }

  static async getRequestLogs(
    keyId: string,
    limit: number = 100
  ): Promise<Array<{
    method: string;
    path: string;
    status_code: number;
    response_time_ms?: number;
    created_at: string;
  }>> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('api_request_log')
      .select('method, path, status_code, response_time_ms, created_at')
      .eq('api_key_id', keyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // ========== UTILITIES ==========

  static getAvailableScopes(): Array<{ value: ApiKeyScope; label: string; description: string }> {
    return [
      { value: 'customers:read', label: 'Read Customers', description: 'View customer data' },
      { value: 'customers:write', label: 'Write Customers', description: 'Create and update customers' },
      { value: 'jobs:read', label: 'Read Jobs', description: 'View job data' },
      { value: 'jobs:write', label: 'Write Jobs', description: 'Create and update jobs' },
      { value: 'invoices:read', label: 'Read Invoices', description: 'View invoice data' },
      { value: 'invoices:write', label: 'Write Invoices', description: 'Create and update invoices' },
      { value: 'estimates:read', label: 'Read Estimates', description: 'View estimate data' },
      { value: 'estimates:write', label: 'Write Estimates', description: 'Create and update estimates' },
    ];
  }

  static hasScope(apiKey: ApiKey, requiredScope: ApiKeyScope): boolean {
    return apiKey.scopes.includes(requiredScope);
  }

  static hasAnyScope(apiKey: ApiKey, requiredScopes: ApiKeyScope[]): boolean {
    return requiredScopes.some(scope => apiKey.scopes.includes(scope));
  }
}
