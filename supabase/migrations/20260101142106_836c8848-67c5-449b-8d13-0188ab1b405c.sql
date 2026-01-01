-- Criar tabela de regras de comissão flexíveis
CREATE TABLE public.commission_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  operation_type TEXT, -- Opcional: tipo específico de operação
  user_level TEXT NOT NULL DEFAULT 'bronze', -- bronze, prata, ouro, diamante
  calculation_model TEXT NOT NULL DEFAULT 'valor_bruto', -- saldo_devedor, valor_bruto, ambos
  commission_type TEXT NOT NULL DEFAULT 'percentage', -- percentage, fixed
  commission_value NUMERIC NOT NULL DEFAULT 0, -- % ou valor fixo
  secondary_commission_value NUMERIC DEFAULT 0, -- Para modelo "ambos"
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_commission_rules_company ON public.commission_rules(company_id);
CREATE INDEX idx_commission_rules_bank ON public.commission_rules(bank_name);
CREATE INDEX idx_commission_rules_product ON public.commission_rules(product_name);
CREATE INDEX idx_commission_rules_level ON public.commission_rules(user_level);
CREATE INDEX idx_commission_rules_active ON public.commission_rules(is_active);

-- Índice composto para busca de regra específica
CREATE INDEX idx_commission_rules_lookup ON public.commission_rules(company_id, bank_name, product_name, user_level, is_active);

-- Enable RLS
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage all commission rules"
  ON public.commission_rules
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gestors can manage commission rules for their company"
  ON public.commission_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = commission_rules.company_id
      AND uc.user_id = auth.uid()
      AND uc.company_role = 'gestor'
      AND uc.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = commission_rules.company_id
      AND uc.user_id = auth.uid()
      AND uc.company_role = 'gestor'
      AND uc.is_active = true
    )
  );

CREATE POLICY "Users can view active commission rules for their company"
  ON public.commission_rules
  FOR SELECT
  USING (
    is_active = true AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      company_id IN (SELECT get_user_company_ids(auth.uid()))
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_commission_rules_updated_at
  BEFORE UPDATE ON public.commission_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários na tabela
COMMENT ON TABLE public.commission_rules IS 'Regras de comissão flexíveis por empresa, banco, produto e nível';
COMMENT ON COLUMN public.commission_rules.calculation_model IS 'Modelo de cálculo: saldo_devedor, valor_bruto ou ambos';
COMMENT ON COLUMN public.commission_rules.commission_type IS 'Tipo: percentage (%) ou fixed (R$)';
COMMENT ON COLUMN public.commission_rules.user_level IS 'Nível do usuário: bronze, prata, ouro, diamante';
COMMENT ON COLUMN public.commission_rules.secondary_commission_value IS 'Valor secundário para modelo ambos';