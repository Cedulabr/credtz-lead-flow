-- Add requested_at column to track when the lead was requested by a user
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP WITH TIME ZONE;

-- Add requested_by column to track who requested the lead
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES auth.users(id);

-- Create index for efficient querying of leads requested today
CREATE INDEX IF NOT EXISTS idx_leads_requested_at ON public.leads(requested_at);
CREATE INDEX IF NOT EXISTS idx_leads_requested_by ON public.leads(requested_by);

-- Create a view for daily lead requests tracking (for admins)
CREATE OR REPLACE VIEW public.daily_lead_requests AS
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