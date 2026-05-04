import { createClient } from '@/lib/supabase/server';
import { createHash, randomBytes } from 'crypto';
import { throwDbError } from '@/lib/utils/secure-error-handler';
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
      .select('id, organization_id, name, key_prefix, scopes, rate_limit, is_active, expires_at, revoked_at, last_used_at, created_by, created_at')
      .eq('organization_id', organizationId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });

    if (error) throwDbError(error, 'fetch api keys');
    return data || [];
  }

  static async get(keyId: string): Promise<ApiKey | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('api_keys')
      .select('id, organization_id, name, key_prefix, scopes, rate_limit, is_active, expires_at, revoked_at, last_used_at, created_by, created_at')
      .eq('id', keyId)
      .single();

    if (error) throwDbError(error, 'fetch api key');
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

    if (error) throwDbError(error, 'create api key');

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

    if (error) throwDbError(error, 'update api key');
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

    if (error) throwDbError(error, 'update api key');
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

    try {
      // Use atomic rate limiting function to prevent race conditions
      const { data, error } = await supabase.rpc('check_and_increment_rate_limit', {
        p_key_id: keyId,
      });

      if (error) {
        console.error('Rate limit check failed:', error);
        return { allowed: false, remaining: 0, resetAt: new Date() };
      }

      if (!data) {
        return { allowed: false, remaining: 0, resetAt: new Date() };
      }

      return {
        allowed: data.allowed,
        remaining: data.remaining,
        resetAt: new Date(data.reset_at),
      };
    } catch (error) {
      console.error('Rate limit check exception:', error);
      // Fail secure: deny the request if we can't check the rate limit
      return { allowed: false, remaining: 0, resetAt: new Date() };
    }
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

    if (error) throwDbError(error, 'fetch api request logs');
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

  /**
   * Reset rate limit for an API key (admin function)
   * Useful for testing or manual rate limit resets
   */
  static async resetRateLimit(keyId: string): Promise<boolean> {
    const supabase = await createClient();

    try {
      const { data, error } = await supabase.rpc('reset_rate_limit', {
        p_key_id: keyId,
      });

      if (error) {
        console.error('Rate limit reset failed:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Rate limit reset exception:', error);
      return false;
    }
  }
}
