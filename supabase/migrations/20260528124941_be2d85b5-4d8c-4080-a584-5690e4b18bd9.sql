
CREATE OR REPLACE FUNCTION public.agibank_claim_leads(
  _quantity integer,
  _ddds text[] DEFAULT NULL,
  _tags text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_balance integer;
  v_to_claim integer;
  v_claimed integer := 0;
  v_ids uuid[];
  v_company uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;
  IF _quantity IS NULL OR _quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_quantity');
  END IF;

  -- Lock credits row
  SELECT balance INTO v_balance
  FROM public.agibank_credits
  WHERE user_id = v_uid
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_credits', 'balance', COALESCE(v_balance, 0));
  END IF;

  v_to_claim := LEAST(_quantity, v_balance);

  -- Resolve user's company (for leads.company_id)
  SELECT company_id INTO v_company
  FROM public.user_companies
  WHERE user_id = v_uid AND is_active = true
  LIMIT 1;

  -- Pick pool leads atomically
  WITH candidates AS (
    SELECT le.id
    FROM public.agibank_leads le
    LEFT JOIN public.agibank_lead_lists ll ON ll.id = le.list_id
    WHERE le.agent_id IS NULL
      AND (
        _ddds IS NULL OR array_length(_ddds, 1) IS NULL
        OR substring(regexp_replace(le.phone, '\D', '', 'g') FROM '^(?:55)?(\d{2})') = ANY(_ddds)
      )
      AND (
        _tags IS NULL OR array_length(_tags, 1) IS NULL
        OR COALESCE(NULLIF(le.tag, ''), ll.file_name) = ANY(_tags)
      )
    ORDER BY le.created_at ASC
    LIMIT v_to_claim
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.agibank_leads l
  SET agent_id = v_uid,
      company_id = COALESCE(l.company_id, v_company),
      updated_at = now()
  FROM candidates c
  WHERE l.id = c.id
  RETURNING l.id INTO v_ids;

  v_claimed := COALESCE(array_length(v_ids, 1), 0);

  IF v_claimed > 0 THEN
    UPDATE public.agibank_credits
    SET balance = balance - v_claimed,
        updated_at = now()
    WHERE user_id = v_uid;
  END IF;

  SELECT balance INTO v_balance FROM public.agibank_credits WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'success', true,
    'claimed', v_claimed,
    'requested', _quantity,
    'balance', COALESCE(v_balance, 0)
  );
END $$;

GRANT EXECUTE ON FUNCTION public.agibank_claim_leads(integer, text[], text[]) TO authenticated;
