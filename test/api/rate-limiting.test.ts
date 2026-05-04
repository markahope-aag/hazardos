import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiKeyService } from '@/lib/services/api-key-service';
import { createClient } from '@/lib/supabase/server';

// Mock the server client to simulate atomic rate limiting responses
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('API Key Rate Limiting', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      rpc: vi.fn(),
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase);
  });

  it('should allow requests under rate limit', async () => {
    // Mock sequential responses showing decreasing remaining count
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: { allowed: true, remaining: 2, reset_at: new Date() }, error: null })
      .mockResolvedValueOnce({ data: { allowed: true, remaining: 1, reset_at: new Date() }, error: null })
      .mockResolvedValueOnce({ data: { allowed: true, remaining: 0, reset_at: new Date() }, error: null });

    const testKeyId = 'test-key-id';

    // First request should be allowed
    const result1 = await ApiKeyService.checkRateLimit(testKeyId);
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2);

    // Second request should be allowed
    const result2 = await ApiKeyService.checkRateLimit(testKeyId);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);

    // Third request should be allowed
    const result3 = await ApiKeyService.checkRateLimit(testKeyId);
    expect(result3.allowed).toBe(true);
    expect(result3.remaining).toBe(0);
    
    // Verify the function was called with correct parameters
    expect(mockSupabase.rpc).toHaveBeenCalledWith('check_and_increment_rate_limit', {
      p_key_id: testKeyId,
    });
  });

  it('should reject requests over rate limit', async () => {
    // Mock response showing rate limit exceeded
    mockSupabase.rpc
      .mockResolvedValue({ data: { allowed: false, remaining: 0, reset_at: new Date() }, error: null });

    const testKeyId = 'test-key-id';

    // Request should be rejected
    const result = await ApiKeyService.checkRateLimit(testKeyId);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should handle concurrent requests without race condition', async () => {
    // Mock atomic function that only allows 3 requests
    let callCount = 0;
    mockSupabase.rpc.mockImplementation(() => {
      callCount++;
      if (callCount <= 3) {
        return Promise.resolve({ 
          data: { allowed: true, remaining: 3 - callCount, reset_at: new Date() }, 
          error: null 
        });
      } else {
        return Promise.resolve({ 
          data: { allowed: false, remaining: 0, reset_at: new Date() }, 
          error: null 
        });
      }
    });

    const testKeyId = 'test-key-id';

    // Make multiple concurrent requests that would exceed rate limit
    const promises = Array(10).fill(null).map(() => 
      ApiKeyService.checkRateLimit(testKeyId)
    );

    const results = await Promise.all(promises);
    
    // Count allowed requests
    const allowedCount = results.filter(r => r.allowed).length;
    
    // Should only allow exactly 3 requests (the rate limit)
    expect(allowedCount).toBe(3);
    
    // All denied requests should have remaining = 0
    const deniedResults = results.filter(r => !r.allowed);
    deniedResults.forEach(result => {
      expect(result.remaining).toBe(0);
    });
  });

  it('should reset rate limit after time window', async () => {
    const testKeyId = 'test-key-id';

    // Mock reset function returning success
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: true, error: null }) // reset_rate_limit
      .mockResolvedValueOnce({ data: { allowed: true, remaining: 2, reset_at: new Date() }, error: null }); // check after reset

    // Reset the rate limit
    const resetSuccess = await ApiKeyService.resetRateLimit(testKeyId);
    expect(resetSuccess).toBe(true);

    // Should now allow requests again
    const afterReset = await ApiKeyService.checkRateLimit(testKeyId);
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(2);
  });

  it('should handle invalid key ID gracefully', async () => {
    // Mock function returning no data for invalid key
    mockSupabase.rpc
      .mockResolvedValue({ data: null, error: null });

    const result = await ApiKeyService.checkRateLimit('00000000-0000-0000-0000-000000000000');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should handle database errors gracefully', async () => {
    // Mock function returning error
    mockSupabase.rpc
      .mockResolvedValue({ data: null, error: { message: 'Database error' } });

    const result = await ApiKeyService.checkRateLimit('test-key-id');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should handle exceptions gracefully', async () => {
    // Mock function throwing exception
    mockSupabase.rpc
      .mockRejectedValue(new Error('Network error'));

    const result = await ApiKeyService.checkRateLimit('test-key-id');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});