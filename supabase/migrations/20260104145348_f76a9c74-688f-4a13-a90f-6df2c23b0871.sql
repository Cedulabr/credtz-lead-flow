-- RPC segura para retornar ranking (quantidade de vendas) por competência, sem expor dados sensíveis
-- Observação: usamos ::text nas comparações para tolerar colunas uuid/text

CREATE OR REPLACE FUNCTION public.get_televendas_sales_ranking(
  p_company_id text,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  user_id text,
  sales_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT (
    public.has_role_safe(auth.uid()::text, 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id::text = auth.uid()::text
        AND uc.company_id::text = p_company_id
        AND COALESCE(uc.is_active, TRUE) = TRUE
    )
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  RETURN QUERY
  SELECT
    t.user_id::text AS user_id,
    COUNT(*)::int AS sales_count
  FROM public.televendas t
  WHERE t.company_id::text = p_company_id
    AND t.status = 'pago'
    AND (t.data_venda::date BETWEEN p_start_date AND p_end_date)
  GROUP BY t.user_id
  ORDER BY sales_count DESC, t.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_televendas_sales_ranking(text, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_televendas_sales_ranking(text, date, date) TO authenticated;
