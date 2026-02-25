-- 1. Add prioridade_operacional column to televendas
ALTER TABLE public.televendas 
ADD COLUMN IF NOT EXISTS prioridade_operacional text NOT NULL DEFAULT 'normal';

-- 2. Create function to calculate and update priority based on updated_at
CREATE OR REPLACE FUNCTION public.update_televendas_prioridade()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update all non-final proposals
  UPDATE public.televendas
  SET prioridade_operacional = 
    CASE
      WHEN EXTRACT(DAY FROM now() - updated_at) > 10 THEN 'critico'
      WHEN EXTRACT(DAY FROM now() - updated_at) > 5 THEN 'alerta'
      ELSE 'normal'
    END
  WHERE status NOT IN ('proposta_paga', 'proposta_cancelada', 'exclusao_aprovada')
    AND prioridade_operacional IS DISTINCT FROM 
      CASE
        WHEN EXTRACT(DAY FROM now() - updated_at) > 10 THEN 'critico'
        WHEN EXTRACT(DAY FROM now() - updated_at) > 5 THEN 'alerta'
        ELSE 'normal'
      END;
END;
$$;

-- 3. Create function to generate notifications when proposals become critical
CREATE OR REPLACE FUNCTION public.notify_critical_televendas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tv RECORD;
  gestor_id uuid;
  admin_ids uuid[];
BEGIN
  -- Find proposals that just became critical (>10 days without update) and no notification yet
  FOR tv IN
    SELECT t.id, t.nome, t.cpf, t.user_id, t.company_id, t.updated_at,
           EXTRACT(DAY FROM now() - t.updated_at)::int as dias_parado
    FROM public.televendas t
    WHERE t.status NOT IN ('proposta_paga', 'proposta_cancelada', 'exclusao_aprovada')
      AND EXTRACT(DAY FROM now() - t.updated_at) > 10
      AND NOT EXISTS (
        SELECT 1 FROM public.televendas_notifications tn
        WHERE tn.televendas_id = t.id 
          AND tn.notification_type = 'proposta_critica'
          AND tn.created_at > now() - interval '7 days'
      )
  LOOP
    -- Get gestor for this company
    SELECT uc.user_id INTO gestor_id
    FROM public.user_companies uc
    WHERE uc.company_id = tv.company_id
      AND uc.company_role = 'gestor'
      AND uc.is_active = true
    LIMIT 1;

    -- Get all admins
    SELECT array_agg(p.id) INTO admin_ids
    FROM public.profiles p
    WHERE p.role = 'admin';

    -- Notify gestor
    IF gestor_id IS NOT NULL THEN
      INSERT INTO public.televendas_notifications (
        televendas_id, user_id, notification_type, title, message
      ) VALUES (
        tv.id,
        gestor_id,
        'proposta_critica',
        '🚨 Proposta Crítica - ' || tv.nome,
        'Proposta parada há ' || tv.dias_parado || ' dias sem atualização. CPF: ' || COALESCE(tv.cpf, 'N/A')
      );
    END IF;

    -- Notify admins
    IF admin_ids IS NOT NULL THEN
      INSERT INTO public.televendas_notifications (
        televendas_id, user_id, notification_type, title, message
      )
      SELECT 
        tv.id,
        admin_id,
        'proposta_critica',
        '🚨 Proposta Crítica - ' || tv.nome,
        'Proposta parada há ' || tv.dias_parado || ' dias sem atualização. CPF: ' || COALESCE(tv.cpf, 'N/A')
      FROM unnest(admin_ids) AS admin_id
      WHERE admin_id IS DISTINCT FROM gestor_id;
    END IF;
  END LOOP;
END;
$$;

-- 4. Run initial priority calculation
SELECT public.update_televendas_prioridade();

-- 5. Create index for performance
CREATE INDEX IF NOT EXISTS idx_televendas_prioridade ON public.televendas(prioridade_operacional) WHERE status NOT IN ('proposta_paga', 'proposta_cancelada', 'exclusao_aprovada');