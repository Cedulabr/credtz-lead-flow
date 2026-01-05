-- =============================================
-- MÓDULO: BASE OFF - DISTRIBUIÇÃO ATIVA
-- Tabelas para distribuição de clientes e tracking
-- =============================================

-- Tabela para vincular clientes da Base OFF a usuários (Botão Ativo)
CREATE TABLE IF NOT EXISTS public.baseoff_active_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.baseoff_clients(id) ON DELETE CASCADE,
  cpf TEXT NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  notes TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, user_id)
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_baseoff_active_clients_user_id ON public.baseoff_active_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_baseoff_active_clients_cpf ON public.baseoff_active_clients(cpf);
CREATE INDEX IF NOT EXISTS idx_baseoff_active_clients_status ON public.baseoff_active_clients(status);

-- Enable RLS
ALTER TABLE public.baseoff_active_clients ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para usuários verem seus próprios clientes
CREATE POLICY "Users can view their own active clients"
ON public.baseoff_active_clients
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own active clients"
ON public.baseoff_active_clients
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own active clients"
ON public.baseoff_active_clients
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins podem ver tudo
CREATE POLICY "Admins can view all active clients"
ON public.baseoff_active_clients
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_baseoff_active_clients_updated_at
BEFORE UPDATE ON public.baseoff_active_clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();