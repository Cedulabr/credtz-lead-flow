-- 1) import_logs: novas colunas
ALTER TABLE public.import_logs
  ADD COLUMN IF NOT EXISTS convenio text,
  ADD COLUMN IF NOT EXISTS subtipo text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'import',
  ADD COLUMN IF NOT EXISTS fields_updated jsonb,
  ADD COLUMN IF NOT EXISTS skipped_detail jsonb;

-- 2) leads_database: subtipo + estado
ALTER TABLE public.leads_database
  ADD COLUMN IF NOT EXISTS subtipo text,
  ADD COLUMN IF NOT EXISTS estado text;

-- 3) Índice único parcial para deduplicação por contrato
-- Permite mesmo CPF em bancos/parcelas distintas; só bloqueia o mesmo contrato exato.
-- Precisa de company_id resolvido — nem todos os leads têm; usamos cpf_added_by como tenant proxy é frágil.
-- Como leads_database não tem company_id direto hoje, usamos índice global por (cpf, banco, parcela, parcelas_em_aberto).
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_database_contract_unique
  ON public.leads_database (cpf, banco, parcela, parcelas_em_aberto)
  WHERE cpf IS NOT NULL
    AND banco IS NOT NULL
    AND parcela IS NOT NULL
    AND parcelas_em_aberto IS NOT NULL;

-- 4) Índice auxiliar para lookup por CPF normalizado em updates
CREATE INDEX IF NOT EXISTS idx_leads_database_cpf ON public.leads_database (cpf);