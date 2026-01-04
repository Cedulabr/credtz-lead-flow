-- =============================================
-- MÓDULO: CONSULTA BASE OFF
-- Tabelas para armazenar dados de clientes e contratos importados
-- =============================================

-- Tabela principal de clientes/beneficiários
CREATE TABLE public.baseoff_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nb TEXT NOT NULL, -- Número do benefício
  cpf TEXT NOT NULL,
  nome TEXT NOT NULL,
  data_nascimento DATE,
  sexo TEXT,
  nome_mae TEXT,
  nome_pai TEXT,
  naturalidade TEXT,
  esp TEXT, -- Espécie do benefício
  dib DATE, -- Data de início do benefício
  mr NUMERIC, -- Margem
  banco_pagto TEXT,
  agencia_pagto TEXT,
  orgao_pagador TEXT,
  conta_corrente TEXT,
  meio_pagto TEXT,
  status_beneficio TEXT,
  bloqueio TEXT,
  pensao_alimenticia TEXT,
  representante TEXT,
  ddb DATE, -- Data de despacho do benefício
  banco_rmc TEXT,
  valor_rmc NUMERIC,
  banco_rcc TEXT,
  valor_rcc NUMERIC,
  -- Endereço principal (do benefício)
  bairro TEXT,
  municipio TEXT,
  uf TEXT,
  cep TEXT,
  endereco TEXT,
  -- Endereço secundário (residencial)
  logr_tipo_1 TEXT,
  logr_titulo_1 TEXT,
  logr_nome_1 TEXT,
  logr_numero_1 TEXT,
  logr_complemento_1 TEXT,
  bairro_1 TEXT,
  cidade_1 TEXT,
  uf_1 TEXT,
  cep_1 TEXT,
  -- Telefones
  tel_fixo_1 TEXT,
  tel_fixo_2 TEXT,
  tel_fixo_3 TEXT,
  tel_cel_1 TEXT,
  tel_cel_2 TEXT,
  tel_cel_3 TEXT,
  -- Emails
  email_1 TEXT,
  email_2 TEXT,
  email_3 TEXT,
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  imported_by UUID REFERENCES auth.users(id),
  import_batch_id UUID -- Para rastrear lotes de importação
);

-- Índices para busca rápida
CREATE UNIQUE INDEX idx_baseoff_clients_cpf ON public.baseoff_clients(cpf);
CREATE INDEX idx_baseoff_clients_nb ON public.baseoff_clients(nb);
CREATE INDEX idx_baseoff_clients_nome ON public.baseoff_clients USING gin(to_tsvector('portuguese', nome));
CREATE INDEX idx_baseoff_clients_banco_pagto ON public.baseoff_clients(banco_pagto);

-- Tabela de contratos/empréstimos
CREATE TABLE public.baseoff_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.baseoff_clients(id) ON DELETE CASCADE,
  cpf TEXT NOT NULL, -- Redundância para facilitar importação
  banco_emprestimo TEXT NOT NULL,
  contrato TEXT NOT NULL, -- Número do contrato
  vl_emprestimo NUMERIC,
  inicio_desconto DATE,
  prazo INTEGER,
  vl_parcela NUMERIC,
  tipo_emprestimo TEXT,
  data_averbacao DATE,
  situacao_emprestimo TEXT,
  competencia DATE,
  competencia_final DATE,
  taxa NUMERIC,
  saldo NUMERIC,
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice único para evitar duplicidade de contrato por CPF
CREATE UNIQUE INDEX idx_baseoff_contracts_cpf_contrato ON public.baseoff_contracts(cpf, contrato);
CREATE INDEX idx_baseoff_contracts_client_id ON public.baseoff_contracts(client_id);
CREATE INDEX idx_baseoff_contracts_banco ON public.baseoff_contracts(banco_emprestimo);
CREATE INDEX idx_baseoff_contracts_situacao ON public.baseoff_contracts(situacao_emprestimo);

-- Tabela para rastrear lotes de importação
CREATE TABLE public.baseoff_import_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  total_records INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing', -- processing, completed, failed
  error_details JSONB,
  imported_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.baseoff_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baseoff_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baseoff_import_batches ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para baseoff_clients
CREATE POLICY "Admins can manage all baseoff clients"
ON public.baseoff_clients
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view baseoff clients"
ON public.baseoff_clients
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Políticas RLS para baseoff_contracts
CREATE POLICY "Admins can manage all baseoff contracts"
ON public.baseoff_contracts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view baseoff contracts"
ON public.baseoff_contracts
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Políticas RLS para baseoff_import_batches
CREATE POLICY "Admins can manage import batches"
ON public.baseoff_import_batches
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_baseoff_clients_updated_at
BEFORE UPDATE ON public.baseoff_clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_baseoff_contracts_updated_at
BEFORE UPDATE ON public.baseoff_contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();