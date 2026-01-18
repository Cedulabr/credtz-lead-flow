-- Drop and recreate the view without SECURITY DEFINER issue
DROP VIEW IF EXISTS public.daily_lead_requests;

-- Create a proper view that respects RLS
CREATE VIEW public.daily_lead_requests AS
SELECT 
  l.requested_by,
  p.name as user_name,
  p.email as user_email,
  DATE(l.requested_at) as request_date,
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE l.status = 'new_lead') as leads_novos,
  COUNT(*) FILTER (WHERE l.status = 'em_andamento') as em_andamento,
  COUNT(*) FILTER (WHERE l.status = 'cliente_fechado') as clientes_fechados,
  COUNT(*) FILTER (WHERE l.status IN ('recusou_oferta', 'sem_interesse', 'nao_e_cliente')) as recusados
FROM public.leads l
LEFT JOIN public.profiles p ON l.requested_by = p.id
WHERE l.requested_at IS NOT NULL
GROUP BY l.requested_by, p.name, p.email, DATE(l.requested_at)
ORDER BY DATE(l.requested_at) DESC, total_leads DESC;

-- Grant access to the view
GRANT SELECT ON public.daily_lead_requests TO authenticated;