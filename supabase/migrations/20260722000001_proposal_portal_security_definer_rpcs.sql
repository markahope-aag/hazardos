-- ============================================================================
-- SEC22: the proposal portal read was a raw-table SELECT gated by an RLS
-- policy that never checked *which* token the caller held:
--
--   "Public can view proposals with valid access token"
--     FOR SELECT USING (access_token IS NOT NULL
--                       AND access_token_expires_at > now())
--
-- There is no organization_id predicate and it is granted to `public`, so any
-- authenticated user of any tenant could enumerate every unexpired tokened
-- proposal in the database - including its access_token. Verified against the
-- live DB: a freshly created user in an unrelated org read another org's
-- proposal row and its token. Holding that token is enough to fetch the full
-- proposal through the portal and to POST /api/proposals/sign, i.e. to sign
-- another company's contract. Only the application's own `.eq('access_token',
-- token)` was narrowing the result; RLS was not enforcing it.
--
-- The anon role was blocked from this, but incidentally rather than by design
-- (a sibling policy calls get_user_role(), which anon may not execute, so the
-- whole query errors). That also means the portal did not work for genuinely
-- anonymous visitors - the read failed and the route reported "Proposal not
-- found". These functions fix that at the same time.
--
-- Fix, per the rule already documented in test/rls/rls-policies.test.ts:
-- public token flows go through SECURITY DEFINER RPCs, never raw-table anon
-- SELECT. The token is an argument, so the function can only ever return the
-- single row it matches, and the policy is dropped entirely.
--
-- Note the functions never return access_token. The caller already has the
-- one token they are entitled to; echoing it back only creates another way to
-- leak it.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Read: full portal payload for one token.
-- Returns NULL when the token matches nothing, and {"expired": true} when it
-- matches an expired proposal, so the route can keep telling those two cases
-- apart without being able to see anything else.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_proposal_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal proposals%ROWTYPE;
  v_result JSONB;
BEGIN
  IF p_token IS NULL OR btrim(p_token) = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_proposal FROM proposals WHERE access_token = p_token;

  IF v_proposal.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_proposal.access_token_expires_at IS NULL
     OR v_proposal.access_token_expires_at <= now() THEN
    RETURN jsonb_build_object('expired', true);
  END IF;

  SELECT jsonb_build_object(
    'id', p.id,
    'proposal_number', p.proposal_number,
    'status', p.status,
    'access_token_expires_at', p.access_token_expires_at,
    'cover_letter', p.cover_letter,
    'terms_and_conditions', p.terms_and_conditions,
    'payment_terms', p.payment_terms,
    'exclusions', p.exclusions,
    'inclusions', p.inclusions,
    'valid_until', p.valid_until,
    'sent_at', p.sent_at,
    'signed_at', p.signed_at,
    'signer_name', p.signer_name,
    'viewed_count', p.viewed_count,
    'estimate', CASE WHEN e.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', e.id,
      'estimate_number', e.estimate_number,
      'project_name', e.project_name,
      'scope_of_work', e.scope_of_work,
      'subtotal', e.subtotal,
      'markup_percent', e.markup_percent,
      'markup_amount', e.markup_amount,
      'discount_percent', e.discount_percent,
      'discount_amount', e.discount_amount,
      'tax_percent', e.tax_percent,
      'tax_amount', e.tax_amount,
      'total', e.total,
      'estimated_duration_days', e.estimated_duration_days,
      'estimated_start_date', e.estimated_start_date,
      'estimated_end_date', e.estimated_end_date,
      'site_survey', CASE WHEN s.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', s.id,
        'job_name', s.job_name,
        'site_address', s.site_address,
        'site_city', s.site_city,
        'site_state', s.site_state,
        'site_zip', s.site_zip,
        'hazard_type', s.hazard_type
      ) END,
      'line_items', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', li.id,
          'item_type', li.item_type,
          'category', li.category,
          'description', li.description,
          'quantity', li.quantity,
          'unit', li.unit,
          'unit_price', li.unit_price,
          'total_price', li.total_price,
          'is_optional', li.is_optional,
          'is_included', li.is_included,
          'sort_order', li.sort_order
        ) ORDER BY li.sort_order)
        FROM estimate_line_items li WHERE li.estimate_id = e.id
      ), '[]'::jsonb)
    ) END,
    'customer', CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', c.id,
      'company_name', c.company_name,
      'first_name', c.first_name,
      'last_name', c.last_name,
      'email', c.email,
      'phone', c.phone
    ) END,
    'organization', CASE WHEN o.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'address', o.address,
      'city', o.city,
      'state', o.state,
      'zip', o.zip,
      'phone', o.phone,
      'email', o.email,
      'website', o.website
    ) END
  )
  INTO v_result
  FROM proposals p
  LEFT JOIN estimates e ON e.id = p.estimate_id
  LEFT JOIN site_surveys s ON s.id = e.site_survey_id
  LEFT JOIN customers c ON c.id = p.customer_id
  LEFT JOIN organizations o ON o.id = p.organization_id
  WHERE p.id = v_proposal.id;

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------------
-- View tracking. Previously an anon UPDATE that RLS silently refused, so the
-- counter never moved for the visitors it was meant to measure.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_proposal_view(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE proposals
  SET
    status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END,
    viewed_at = CASE WHEN status = 'sent' THEN now() ELSE viewed_at END,
    viewed_count = COALESCE(viewed_count, 0) + 1,
    updated_at = now()
  WHERE access_token = p_token
    AND access_token_expires_at > now()
    AND status IN ('sent', 'viewed');
END;
$$;

-- ---------------------------------------------------------------------------
-- Signing. All the guards the route did in application code are enforced here
-- instead, in one statement, so a caller cannot sign an expired, already-signed
-- or wrong-status proposal even by calling the function directly.
-- Returns the fields the route needs to send its notification.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sign_proposal_by_token(
  p_token TEXT,
  p_signer_name TEXT,
  p_signer_email TEXT,
  p_signer_ip TEXT,
  p_signature_data TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal proposals%ROWTYPE;
BEGIN
  SELECT * INTO v_proposal FROM proposals WHERE access_token = p_token;

  IF v_proposal.id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  IF v_proposal.access_token_expires_at IS NULL
     OR v_proposal.access_token_expires_at <= now() THEN
    RETURN jsonb_build_object('error', 'expired');
  END IF;

  IF v_proposal.status = 'signed' THEN
    RETURN jsonb_build_object('error', 'already_signed');
  END IF;

  IF v_proposal.status NOT IN ('sent', 'viewed') THEN
    RETURN jsonb_build_object('error', 'invalid_status');
  END IF;

  UPDATE proposals
  SET
    status = 'signed',
    signed_at = now(),
    signer_name = p_signer_name,
    signer_email = p_signer_email,
    signer_ip = p_signer_ip,
    signature_data = p_signature_data,
    updated_at = now()
  WHERE id = v_proposal.id;

  UPDATE estimates SET status = 'accepted' WHERE id = v_proposal.estimate_id;

  RETURN jsonb_build_object(
    'id', v_proposal.id,
    'proposal_number', v_proposal.proposal_number,
    'estimate_id', v_proposal.estimate_id,
    'created_by', v_proposal.created_by,
    'organization_id', v_proposal.organization_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_proposal_by_token(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_proposal_view(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sign_proposal_by_token(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_proposal_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_proposal_view(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_proposal_by_token(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- The hole itself. Everything the portal needs now goes through the functions
-- above, so nothing legitimate depends on this any more.
DROP POLICY IF EXISTS "Public can view proposals with valid access token" ON proposals;
