-- Primeiro criar a função de trigger para updated_at se não existir
CREATE OR REPLACE FUNCTION public.update_time_clock_break_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Adicionar tabela para tipos de pausa configuráveis
CREATE TABLE IF NOT EXISTS public.time_clock_break_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_paid BOOLEAN DEFAULT false,
  max_duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_time_clock_break_types_company ON public.time_clock_break_types(company_id);
CREATE INDEX IF NOT EXISTS idx_time_clock_break_types_active ON public.time_clock_break_types(is_active);

-- Enable RLS
ALTER TABLE public.time_clock_break_types ENABLE ROW LEVEL SECURITY;

-- Drop políticas existentes se houver
DROP POLICY IF EXISTS "Todos podem ver tipos de pausa ativos" ON public.time_clock_break_types;
DROP POLICY IF EXISTS "Admins podem gerenciar tipos de pausa" ON public.time_clock_break_types;
DROP POLICY IF EXISTS "Gestores podem gerenciar tipos de pausa da empresa" ON public.time_clock_break_types;

-- Políticas RLS
CREATE POLICY "Todos podem ver tipos de pausa ativos"
  ON public.time_clock_break_types
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins podem gerenciar tipos de pausa"
  ON public.time_clock_break_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Gestores podem gerenciar tipos de pausa da empresa"
  ON public.time_clock_break_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_companies
      WHERE user_companies.user_id = auth.uid()
        AND user_companies.company_id = time_clock_break_types.company_id
        AND user_companies.company_role = 'gestor'
        AND user_companies.is_active = true
    )
  );

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_time_clock_break_types_updated_at ON public.time_clock_break_types;
CREATE TRIGGER update_time_clock_break_types_updated_at
  BEFORE UPDATE ON public.time_clock_break_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_time_clock_break_types_updated_at();

-- Inserir tipos de pausa padrão (apenas se tabela estiver vazia)
INSERT INTO public.time_clock_break_types (name, description, is_paid, max_duration_minutes, display_order)
SELECT 'Almoço', 'Intervalo para refeição', false, 60, 1
WHERE NOT EXISTS (SELECT 1 FROM public.time_clock_break_types WHERE name = 'Almoço');

INSERT INTO public.time_clock_break_types (name, description, is_paid, max_duration_minutes, display_order)
SELECT 'Banheiro', 'Pausa para uso do banheiro', true, 10, 2
WHERE NOT EXISTS (SELECT 1 FROM public.time_clock_break_types WHERE name = 'Banheiro');

INSERT INTO public.time_clock_break_types (name, description, is_paid, max_duration_minutes, display_order)
SELECT 'Café', 'Pausa para café/lanche', true, 15, 3
WHERE NOT EXISTS (SELECT 1 FROM public.time_clock_break_types WHERE name = 'Café');

INSERT INTO public.time_clock_break_types (name, description, is_paid, max_duration_minutes, display_order)
SELECT 'Descanso', 'Intervalo de descanso', true, 15, 4
WHERE NOT EXISTS (SELECT 1 FROM public.time_clock_break_types WHERE name = 'Descanso');

-- Adicionar coluna break_type_id na tabela time_clock
ALTER TABLE public.time_clock ADD COLUMN IF NOT EXISTS break_type_id UUID REFERENCES public.time_clock_break_types(id);

-- Índice para o novo campo
CREATE INDEX IF NOT EXISTS idx_time_clock_break_type ON public.time_clock(break_type_id);