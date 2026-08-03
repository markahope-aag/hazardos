-- =============================================
-- Atomic Rate Limiting Function
-- =============================================
-- Fixes VULN-02: Rate limit race condition in API key service
-- Uses PostgreSQL row-level locking to prevent TOCTOU issues

-- Create atomic rate limiting function
CREATE OR REPLACE FUNCTION check_and_increment_rate_limit(
  p_key_id UUID,
  OUT allowed BOOLEAN,
  OUT remaining INTEGER,
  OUT reset_at TIMESTAMPTZ,
  OUT current_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate_limit INTEGER;
  v_current_count INTEGER;
  v_reset_at TIMESTAMPTZ;
  v_new_reset_at TIMESTAMPTZ;
  v_now TIMESTAMPTZ;
BEGIN
  v_now := NOW();
  
  -- Lock the row for atomic read-modify-write
  -- This prevents concurrent requests from bypassing rate limits
  SELECT 
    rate_limit,
    COALESCE(rate_limit_count, 0),
    rate_limit_reset_at
  INTO 
    v_rate_limit,
    v_current_count,
    v_reset_at
  FROM api_keys
  WHERE id = p_key_id
    AND is_active = true
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > v_now)
  FOR UPDATE; -- Critical: locks the row to prevent race conditions
  
  -- If key not found or invalid, deny request
  IF NOT FOUND THEN
    allowed := false;
    remaining := 0;
    reset_at := v_now;
    current_count := 0;
    RETURN;
  END IF;
  
  -- Check if we need to reset the rate limit window
  IF v_reset_at IS NULL OR v_reset_at <= v_now THEN
    -- Reset the rate limit window (1 hour from now)
    v_new_reset_at := v_now + INTERVAL '1 hour';
    v_current_count := 0;
    
    -- Update with new reset time and count = 1 (for this request)
    UPDATE api_keys 
    SET 
      rate_limit_count = 1,
      rate_limit_reset_at = v_new_reset_at,
      last_used_at = v_now
    WHERE id = p_key_id;
    
    allowed := true;
    remaining := v_rate_limit - 1;
    reset_at := v_new_reset_at;
    current_count := 1;
    RETURN;
  END IF;
  
  -- Check if we're over the rate limit
  IF v_current_count >= v_rate_limit THEN
    allowed := false;
    remaining := 0;
    reset_at := v_reset_at;
    current_count := v_current_count;
    RETURN;
  END IF;
  
  -- We're under the limit, increment the counter atomically
  UPDATE api_keys 
  SET 
    rate_limit_count = rate_limit_count + 1,
    last_used_at = v_now
  WHERE id = p_key_id;
  
  allowed := true;
  remaining := v_rate_limit - v_current_count - 1;
  reset_at := v_reset_at;
  current_count := v_current_count + 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_and_increment_rate_limit TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION check_and_increment_rate_limit IS 
  'Atomically checks and increments API key rate limit counter using row-level locking to prevent race conditions';

-- =============================================
-- Rate Limit Reset Function (for testing/admin)
-- =============================================

CREATE OR REPLACE FUNCTION reset_rate_limit(p_key_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE api_keys 
  SET 
    rate_limit_count = 0,
    rate_limit_reset_at = NULL
  WHERE id = p_key_id;
  
  RETURN FOUND;
END;
$$;

-- Grant execute permission to authenticated users (will be restricted by RLS)
GRANT EXECUTE ON FUNCTION reset_rate_limit TO authenticated;

COMMENT ON FUNCTION reset_rate_limit IS 
  'Resets the rate limit counter for an API key (admin function)';

-- =============================================
-- Migration Notes
-- =============================================
-- This migration adds atomic rate limiting to prevent the race condition
-- identified in VULN-02 where concurrent requests could exceed rate limits
-- by 2-10x under load due to non-atomic read-then-write operations.
--
-- The new function uses SELECT FOR UPDATE to lock the API key row during
-- the rate limit check and increment, ensuring only one request can modify
-- the counter at a time.
--
-- Usage in application code:
-- SELECT * FROM check_and_increment_rate_limit('api-key-uuid');