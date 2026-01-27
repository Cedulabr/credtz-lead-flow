
# Guia Completo de Migracao - Supabase Cloud para Self-Hosted

Este guia contem todos os scripts SQL necessarios para migrar o banco de dados do Credtz Lead Flow do Supabase Cloud para uma instancia Supabase Self-Hosted.

---

## INDICE

1. Pre-Requisitos e Preparacao
2. Enums (Tipos Enumerados)
3. Funcoes Utilitarias Base
4. Tabelas Principais
5. Tabelas de Relacionamento
6. Tabelas de Historico e Auditoria
7. Funcoes de Negocio (RPCs)
8. Triggers
9. Policies RLS
10. Indices
11. Views
12. Dados Iniciais (Seeds)
13. Instrucoes de Execucao

---

## 1. PRE-REQUISITOS

### No Supabase Cloud (origem):
```text
-- Exportar dados usando pg_dump
pg_dump -h db.qwgsplcqyongfsqdjrme.supabase.co \
  -U postgres \
  -d postgres \
  --schema=public \
  --data-only \
  -F c \
  -f credtz_data_backup.dump
```

### No Supabase Self-Hosted (destino):
```text
-- Criar extensoes necessarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";  -- Para jobs agendados
```

---

## 2. ENUMS (TIPOS ENUMERADOS)

```text
-- =====================================================
-- ENUMS DO SISTEMA CREDTZ
-- =====================================================

-- Papel do usuario no sistema
CREATE TYPE public.app_role AS ENUM ('admin', 'partner');

-- Nivel do usuario
CREATE TYPE public.user_level AS ENUM ('bronze', 'prata', 'ouro', 'diamante');

-- Papel na empresa
CREATE TYPE public.company_role AS ENUM ('gestor', 'colaborador');

-- Tipo de pessoa (PF/PJ)
CREATE TYPE public.person_type AS ENUM ('pf', 'pj');

-- Status de documentos de usuario
CREATE TYPE public.document_status AS ENUM ('pending', 'sent', 'approved', 'rejected');

-- Status de dados do usuario
CREATE TYPE public.user_data_status AS ENUM ('incomplete', 'in_review', 'approved', 'rejected');

-- Tipo de registro no ponto
CREATE TYPE public.time_clock_type AS ENUM ('entrada', 'pausa_inicio', 'pausa_fim', 'saida');

-- Status do registro de ponto
CREATE TYPE public.time_clock_status AS ENUM ('completo', 'incompleto', 'ajustado', 'pendente');

-- Tipo de acesso colaborativo
CREATE TYPE public.collaborative_access_type AS ENUM ('admin', 'operator', 'readonly');

-- Categoria de links colaborativos
CREATE TYPE public.collaborative_link_category AS ENUM ('banco', 'governo', 'parceiros', 'marketing', 'ferramentas', 'outros');

-- Tipo de permissao colaborativa
CREATE TYPE public.collaborative_permission_type AS ENUM ('view', 'edit', 'create', 'delete');
```

---

## 3. FUNCOES UTILITARIAS BASE

```text
-- =====================================================
-- FUNCOES BASE DO SISTEMA
-- =====================================================

-- Funcao para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Funcao para verificar role do usuario (Security Definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role = _role
  )
$$;

-- Versao segura da funcao has_role
CREATE OR REPLACE FUNCTION public.has_role_safe(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = _user_id) = _role,
    false
  )
$$;

-- Verificar se usuario e admin global
CREATE OR REPLACE FUNCTION public.is_global_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'admin'
  )
$$;

-- Verificar se usuario e gestor ou admin
CREATE OR REPLACE FUNCTION public.is_gestor_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.user_companies
    WHERE user_id = _user_id 
    AND company_role = 'gestor'
    AND is_active = true
  )
$$;

-- Obter IDs das empresas do usuario
CREATE OR REPLACE FUNCTION public.get_user_company_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.user_companies
  WHERE user_id = _user_id AND is_active = true
$$;

-- Obter ID da empresa principal do usuario
CREATE OR REPLACE FUNCTION public.get_user_primary_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.user_companies
  WHERE user_id = _user_id AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1
$$;

-- Verificar se usuario pertence a empresa
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_companies
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND is_active = true
  )
$$;

-- Verificar se usuario e gestor da empresa
CREATE OR REPLACE FUNCTION public.is_company_gestor(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_companies
    WHERE user_id = _user_id 
    AND company_id = _company_id
    AND company_role = 'gestor'
    AND is_active = true
  )
$$;

-- Normalizar CPF
CREATE OR REPLACE FUNCTION public.normalize_cpf(input_cpf text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF input_cpf IS NULL OR input_cpf = '' THEN
    RETURN input_cpf;
  END IF;
  RETURN LPAD(REGEXP_REPLACE(input_cpf, '[^0-9]', '', 'g'), 11, '0');
END;
$$;

-- Validar CPF
CREATE OR REPLACE FUNCTION public.validate_cpf(cpf_input text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cpf text;
  sum_1 integer := 0;
  sum_2 integer := 0;
  digit_1 integer;
  digit_2 integer;
  i integer;
BEGIN
  cpf := regexp_replace(cpf_input, '[^0-9]', '', 'g');
  IF length(cpf) != 11 OR 
     cpf IN ('00000000000', '11111111111', '22222222222', '33333333333', 
             '44444444444', '55555555555', '66666666666', '77777777777',
             '88888888888', '99999999999') THEN
    RETURN false;
  END IF;
  FOR i IN 1..9 LOOP
    sum_1 := sum_1 + (substring(cpf, i, 1)::integer * (11 - i));
  END LOOP;
  digit_1 := 11 - (sum_1 % 11);
  IF digit_1 >= 10 THEN digit_1 := 0; END IF;
  FOR i IN 1..10 LOOP
    sum_2 := sum_2 + (substring(cpf, i, 1)::integer * (12 - i));
  END LOOP;
  digit_2 := 11 - (sum_2 % 11);
  IF digit_2 >= 10 THEN digit_2 := 0; END IF;
  RETURN digit_1 = substring(cpf, 10, 1)::integer AND 
         digit_2 = substring(cpf, 11, 1)::integer;
END;
$$;

-- Validar email
CREATE OR REPLACE FUNCTION public.validate_email(email_input text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN email_input ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;

-- Validar telefone
CREATE OR REPLACE FUNCTION public.validate_phone(phone_input text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  phone text;
BEGIN
  phone := regexp_replace(phone_input, '[^0-9]', '', 'g');
  RETURN length(phone) IN (10, 11) AND phone ~ '^[0-9]+$';
END;
$$;
```

---

## 4. TABELAS PRINCIPAIS

### 4.1 Profiles (Usuarios)
```text
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'partner',
  name VARCHAR,
  email TEXT,
  phone TEXT,
  cpf TEXT,
  company TEXT,
  sector VARCHAR,
  pix_key TEXT,
  level user_level,
  organization_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  leads_premium_enabled BOOLEAN DEFAULT false,
  sms_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,
  can_access_premium_leads BOOLEAN DEFAULT false,
  can_access_activate_leads BOOLEAN DEFAULT false,
  can_access_televendas BOOLEAN DEFAULT false,
  can_access_gestao_televendas BOOLEAN DEFAULT false,
  can_access_meus_clientes BOOLEAN DEFAULT false,
  can_access_minhas_comissoes BOOLEAN DEFAULT false,
  can_access_tabela_comissoes BOOLEAN DEFAULT false,
  can_access_gerador_propostas BOOLEAN DEFAULT false,
  can_access_indicar BOOLEAN DEFAULT false,
  can_access_alertas BOOLEAN DEFAULT false,
  can_access_financas BOOLEAN DEFAULT false,
  can_access_documentos BOOLEAN DEFAULT false,
  can_access_sms BOOLEAN DEFAULT false,
  can_access_whatsapp BOOLEAN DEFAULT false,
  can_access_baseoff_consulta BOOLEAN DEFAULT false,
  can_access_colaborativo BOOLEAN DEFAULT false,
  can_access_controle_ponto BOOLEAN DEFAULT false,
  can_access_relatorio_desempenho BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

### 4.2 Companies (Empresas)
```text
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
```

### 4.3 User Companies (Vinculo Usuario-Empresa)
```text
CREATE TABLE public.user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_role company_role DEFAULT 'colaborador',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, company_id)
);

ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;
```

### 4.4 Leads Database (Base de Leads Premium)
```text
CREATE TABLE public.leads_database (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cpf TEXT,
  phone TEXT NOT NULL,
  phone2 TEXT,
  convenio TEXT NOT NULL,
  banco TEXT,
  tipo_beneficio TEXT,
  data_nascimento TEXT,
  idade INTEGER,
  parcela NUMERIC,
  parcelas_pagas INTEGER,
  parcelas_em_aberto INTEGER,
  tag TEXT,
  is_available BOOLEAN DEFAULT true,
  cpf_added_at TIMESTAMPTZ,
  cpf_added_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.leads_database ENABLE ROW LEVEL SECURITY;
```

### 4.5 Leads Distribution (Distribuicao de Leads)
```text
CREATE TABLE public.leads_distribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads_database(id) ON DELETE CASCADE,
  cpf TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  distributed_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '10 years'),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.leads_distribution ENABLE ROW LEVEL SECURITY;
```

### 4.6 Leads Blacklist
```text
CREATE TABLE public.leads_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf TEXT NOT NULL,
  reason TEXT,
  blacklisted_by UUID REFERENCES auth.users(id),
  blacklisted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_blacklist_cpf UNIQUE(cpf)
);

ALTER TABLE public.leads_blacklist ENABLE ROW LEVEL SECURITY;
```

### 4.7 Leads (Leads Ativos)
```text
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cpf TEXT,
  phone TEXT NOT NULL,
  phone2 TEXT,
  convenio TEXT,
  banco TEXT,
  status TEXT DEFAULT 'new_lead',
  stage TEXT DEFAULT 'new',
  priority TEXT DEFAULT 'medium',
  notes TEXT,
  history JSONB,
  assigned_to UUID REFERENCES auth.users(id),
  requested_by UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES public.companies(id),
  future_contact_date TIMESTAMPTZ,
  original_status TEXT,
  is_rework BOOLEAN DEFAULT false,
  rework_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
```

### 4.8 Activate Leads
```text
CREATE TABLE public.activate_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  cpf TEXT,
  produto TEXT,
  status TEXT DEFAULT 'novo',
  origem TEXT DEFAULT 'manual',
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES public.companies(id),
  motivo_recusa TEXT,
  proxima_acao TEXT,
  data_proxima_operacao TEXT,
  ultima_interacao TIMESTAMPTZ,
  simulation_id UUID,
  simulation_status TEXT,
  segunda_tentativa BOOLEAN DEFAULT false,
  segunda_tentativa_at TIMESTAMPTZ,
  segunda_tentativa_by UUID,
  has_quality_issues BOOLEAN DEFAULT false,
  quality_issues JSONB,
  sanitized BOOLEAN DEFAULT false,
  sanitized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.activate_leads ENABLE ROW LEVEL SECURITY;
```

### 4.9 Activate Leads Blacklist
```text
CREATE TABLE public.activate_leads_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone TEXT NOT NULL,
  nome TEXT,
  cpf TEXT,
  reason TEXT NOT NULL,
  blacklisted_by UUID REFERENCES auth.users(id),
  blacklisted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  original_lead_id UUID REFERENCES public.activate_leads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_activate_blacklist_telefone UNIQUE(telefone)
);

ALTER TABLE public.activate_leads_blacklist ENABLE ROW LEVEL SECURITY;
```

### 4.10 Televendas
```text
CREATE TABLE public.televendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  telefone TEXT,
  banco TEXT,
  tipo_operacao TEXT,
  parcela NUMERIC,
  troco NUMERIC,
  saldo_devedor NUMERIC,
  data_venda TEXT,
  observacao TEXT,
  status TEXT DEFAULT 'pendente',
  user_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID REFERENCES public.companies(id),
  lead_id UUID REFERENCES public.leads(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT televendas_status_check CHECK (status IN (
    'pendente', 'pago', 'cancelado', 'solicitado_digitacao', 'proposta_digitada',
    'pago_aguardando', 'cancelado_aguardando', 'devolvido', 'pago_aprovado',
    'cancelado_confirmado', 'solicitar_exclusao', 'proposta_paga', 'proposta_cancelada',
    'proposta_pendente', 'exclusao_aprovada', 'exclusao_rejeitada', 'solicitar_digitacao'
  ))
);

ALTER TABLE public.televendas ENABLE ROW LEVEL SECURITY;
```

### 4.11 Commissions (Comissoes)
```text
CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  client_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  credit_value NUMERIC NOT NULL,
  commission_percentage NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  proposal_date DATE,
  payment_date DATE,
  payment_method TEXT,
  notes TEXT,
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
```

### 4.12 User Credits
```text
CREATE TABLE public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  credits_balance INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
```

### 4.13 Credits History
```text
CREATE TABLE public.credits_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credits_history ENABLE ROW LEVEL SECURITY;
```

### 4.14 BaseOff (Base de Dados INSS)
```text
CREATE TABLE public.baseoff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf TEXT NOT NULL,
  nome TEXT NOT NULL,
  banco TEXT NOT NULL,
  telefone1 TEXT,
  telefone2 TEXT,
  telefone3 TEXT,
  valor_beneficio TEXT,
  margem_disponivel TEXT,
  uf TEXT,
  municipio TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.baseoff ENABLE ROW LEVEL SECURITY;
```

### 4.15 BaseOff Clients (Clientes com dados completos)
```text
CREATE TABLE public.baseoff_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf TEXT NOT NULL,
  nome TEXT NOT NULL,
  nb TEXT NOT NULL,
  data_nascimento TEXT,
  sexo TEXT,
  nome_mae TEXT,
  nome_pai TEXT,
  naturalidade TEXT,
  uf TEXT,
  municipio TEXT,
  endereco TEXT,
  bairro TEXT,
  cep TEXT,
  status_beneficio TEXT,
  esp TEXT,
  dib TEXT,
  ddb TEXT,
  mr NUMERIC,
  valor_rmc NUMERIC,
  valor_rcc NUMERIC,
  banco_rmc TEXT,
  banco_rcc TEXT,
  meio_pagto TEXT,
  banco_pagto TEXT,
  agencia_pagto TEXT,
  conta_corrente TEXT,
  orgao_pagador TEXT,
  bloqueio TEXT,
  pensao_alimenticia TEXT,
  representante TEXT,
  tel_cel_1 TEXT,
  tel_cel_2 TEXT,
  tel_cel_3 TEXT,
  tel_fixo_1 TEXT,
  tel_fixo_2 TEXT,
  tel_fixo_3 TEXT,
  email_1 TEXT,
  email_2 TEXT,
  email_3 TEXT,
  logr_tipo_1 TEXT,
  logr_titulo_1 TEXT,
  logr_nome_1 TEXT,
  logr_numero_1 TEXT,
  logr_complemento_1 TEXT,
  bairro_1 TEXT,
  cidade_1 TEXT,
  uf_1 TEXT,
  cep_1 TEXT,
  import_batch_id UUID,
  imported_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.baseoff_clients ENABLE ROW LEVEL SECURITY;
```

### 4.16 BaseOff Contracts
```text
CREATE TABLE public.baseoff_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.baseoff_clients(id) ON DELETE CASCADE,
  cpf TEXT NOT NULL,
  contrato TEXT NOT NULL,
  banco_emprestimo TEXT NOT NULL,
  tipo_emprestimo TEXT,
  situacao_emprestimo TEXT,
  vl_emprestimo NUMERIC,
  vl_parcela NUMERIC,
  prazo INTEGER,
  taxa NUMERIC,
  saldo NUMERIC,
  data_averbacao TEXT,
  competencia TEXT,
  competencia_final TEXT,
  inicio_desconto TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.baseoff_contracts ENABLE ROW LEVEL SECURITY;
```

### 4.17 Time Clock (Ponto Eletronico)
```text
CREATE TABLE public.time_clock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID REFERENCES public.companies(id),
  clock_type time_clock_type NOT NULL,
  clock_date DATE DEFAULT CURRENT_DATE,
  clock_time TIME DEFAULT CURRENT_TIME,
  status time_clock_status DEFAULT 'pendente',
  latitude NUMERIC,
  longitude NUMERIC,
  city TEXT,
  state TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB,
  photo_url TEXT,
  notes TEXT,
  break_type_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.time_clock ENABLE ROW LEVEL SECURITY;
```

### 4.18 User Data (Dados Cadastrais)
```text
CREATE TABLE public.user_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  person_type person_type DEFAULT 'pf',
  full_name TEXT,
  phone TEXT,
  personal_email TEXT,
  cpf TEXT,
  rg TEXT,
  birth_date DATE,
  marital_status TEXT,
  cnpj TEXT,
  trade_name TEXT,
  legal_representative TEXT,
  legal_representative_cpf TEXT,
  cep TEXT,
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  pix_key TEXT,
  pix_key_type TEXT,
  status user_data_status DEFAULT 'incomplete',
  internal_observations TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejected_by UUID,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
```

---

## 5. TABELAS DE HISTORICO E AUDITORIA

```text
-- Audit Log geral
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  record_id UUID,
  timestamp TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Historico de Televendas
CREATE TABLE public.televendas_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  televendas_id UUID NOT NULL REFERENCES public.televendas(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT,
  notes TEXT
);

ALTER TABLE public.televendas_status_history ENABLE ROW LEVEL SECURITY;

-- Historico de Activate Leads
CREATE TABLE public.activate_leads_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.activate_leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.activate_leads_history ENABLE ROW LEVEL SECURITY;

-- Historico de Creditos
CREATE TABLE public.credits_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credits_history ENABLE ROW LEVEL SECURITY;
```

---

## 6. TRIGGERS PRINCIPAIS

```text
-- =====================================================
-- TRIGGERS DO SISTEMA
-- =====================================================

-- Trigger para criar profile automaticamente apos registro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name, email)
  VALUES (
    NEW.id, 
    'partner'::app_role,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers de updated_at para todas as tabelas principais
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_activate_leads_updated_at
  BEFORE UPDATE ON public.activate_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_televendas_updated_at
  BEFORE UPDATE ON public.televendas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commissions_updated_at
  BEFORE UPDATE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para normalizar CPF antes de inserir/atualizar
CREATE OR REPLACE FUNCTION public.normalize_cpf_on_insert_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.cpf IS NOT NULL AND NEW.cpf != '' THEN
    NEW.cpf := LPAD(REGEXP_REPLACE(NEW.cpf, '[^0-9]', '', 'g'), 11, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER normalize_cpf_leads
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.normalize_cpf_on_insert_update();

CREATE TRIGGER normalize_cpf_televendas
  BEFORE INSERT OR UPDATE ON public.televendas
  FOR EACH ROW EXECUTE FUNCTION public.normalize_cpf_on_insert_update();
```

---

## 7. POLICIES RLS PRINCIPAIS

```text
-- =====================================================
-- POLICIES RLS - PROFILES
-- =====================================================

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role_safe(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role_safe(auth.uid(), 'admin'::app_role));

-- =====================================================
-- POLICIES RLS - COMPANIES
-- =====================================================

CREATE POLICY "Admins can manage companies"
  ON public.companies FOR ALL
  USING (public.has_role_safe(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their companies"
  ON public.companies FOR SELECT
  USING (
    id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() AND is_active = true)
  );

-- =====================================================
-- POLICIES RLS - LEADS
-- =====================================================

CREATE POLICY "Users can view leads from their company"
  ON public.leads FOR SELECT
  USING (
    company_id IN (SELECT public.get_user_company_ids(auth.uid()))
    OR public.has_role_safe(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can create leads"
  ON public.leads FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their own leads"
  ON public.leads FOR UPDATE
  USING (
    requested_by = auth.uid()
    OR assigned_to = auth.uid()
    OR public.is_gestor_or_admin(auth.uid())
  );

-- =====================================================
-- POLICIES RLS - TELEVENDAS
-- =====================================================

CREATE POLICY "Users can view their own televendas"
  ON public.televendas FOR SELECT
  USING (
    user_id = auth.uid()
    OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
    OR public.has_role_safe(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can insert their own televendas"
  ON public.televendas FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Gestors can manage company televendas"
  ON public.televendas FOR UPDATE
  USING (
    user_id = auth.uid()
    OR public.is_company_gestor(auth.uid(), company_id)
    OR public.has_role_safe(auth.uid(), 'admin'::app_role)
  );

-- =====================================================
-- POLICIES RLS - COMMISSIONS
-- =====================================================

CREATE POLICY "Users can view their own commissions"
  ON public.commissions FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.has_role_safe(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can manage all commissions"
  ON public.commissions FOR ALL
  USING (public.has_role_safe(auth.uid(), 'admin'::app_role));
```

---

## 8. FUNCOES RPC DE NEGOCIO

```text
-- Funcao para adicionar lead ao blacklist
CREATE OR REPLACE FUNCTION public.add_lead_to_blacklist(lead_cpf text, blacklist_reason text DEFAULT 'recusou_oferta')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.leads_blacklist (cpf, reason, blacklisted_by, expires_at)
  VALUES (lead_cpf, blacklist_reason, auth.uid(), now() + interval '30 days')
  ON CONFLICT ON CONSTRAINT unique_blacklist_cpf DO UPDATE
  SET 
    reason = EXCLUDED.reason,
    blacklisted_at = now(),
    expires_at = now() + interval '30 days',
    blacklisted_by = auth.uid();
END;
$$;

-- Funcao para adicionar activate lead ao blacklist
CREATE OR REPLACE FUNCTION public.add_activate_lead_to_blacklist(
  p_telefone TEXT,
  p_nome TEXT DEFAULT NULL,
  p_cpf TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT 'sem_possibilidade',
  p_lead_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activate_leads_blacklist (telefone, nome, cpf, reason, blacklisted_by, expires_at, original_lead_id)
  VALUES (p_telefone, p_nome, p_cpf, p_reason, auth.uid(), now() + interval '30 days', p_lead_id)
  ON CONFLICT ON CONSTRAINT unique_activate_blacklist_telefone DO UPDATE
  SET 
    nome = COALESCE(EXCLUDED.nome, activate_leads_blacklist.nome),
    cpf = COALESCE(EXCLUDED.cpf, activate_leads_blacklist.cpf),
    reason = EXCLUDED.reason,
    blacklisted_at = now(),
    expires_at = now() + interval '30 days',
    blacklisted_by = auth.uid(),
    original_lead_id = COALESCE(EXCLUDED.original_lead_id, activate_leads_blacklist.original_lead_id);
END;
$$;

-- Funcao para liberar leads expirados do blacklist
CREATE OR REPLACE FUNCTION public.release_expired_blacklisted_leads()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  leads_premium_released INTEGER := 0;
  activate_leads_released INTEGER := 0;
  expired_cpfs TEXT[];
  expired_telefones TEXT[];
BEGIN
  SELECT ARRAY_AGG(cpf) INTO expired_cpfs
  FROM public.leads_blacklist
  WHERE expires_at <= now();

  IF expired_cpfs IS NOT NULL AND array_length(expired_cpfs, 1) > 0 THEN
    UPDATE public.leads_database
    SET is_available = true, updated_at = now()
    WHERE cpf = ANY(expired_cpfs);
    
    GET DIAGNOSTICS leads_premium_released = ROW_COUNT;
    
    DELETE FROM public.leads_blacklist
    WHERE expires_at <= now();
  END IF;

  SELECT ARRAY_AGG(telefone) INTO expired_telefones
  FROM public.activate_leads_blacklist
  WHERE expires_at <= now();

  IF expired_telefones IS NOT NULL AND array_length(expired_telefones, 1) > 0 THEN
    UPDATE public.activate_leads
    SET 
      status = 'novo',
      assigned_to = NULL,
      motivo_recusa = NULL,
      ultima_interacao = now(),
      updated_at = now()
    WHERE telefone = ANY(expired_telefones)
    AND status IN ('sem_possibilidade', 'sem_interesse', 'fora_do_perfil');
    
    GET DIAGNOSTICS activate_leads_released = ROW_COUNT;
    
    DELETE FROM public.activate_leads_blacklist
    WHERE expires_at <= now();
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'leads_premium_released', leads_premium_released,
    'activate_leads_released', activate_leads_released,
    'executed_at', now()
  );
END;
$$;

-- Funcao para gerenciar creditos
CREATE OR REPLACE FUNCTION public.admin_manage_credits(
  target_user_id uuid,
  credit_action text,
  credit_amount integer,
  credit_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance integer;
  new_balance integer;
  result jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem gerenciar creditos';
  END IF;
  
  SELECT credits_balance INTO current_balance
  FROM public.user_credits
  WHERE user_id = target_user_id;
  
  IF current_balance IS NULL THEN
    INSERT INTO public.user_credits (user_id, credits_balance)
    VALUES (target_user_id, 0);
    current_balance := 0;
  END IF;
  
  IF credit_action = 'add' THEN
    new_balance := current_balance + credit_amount;
  ELSE
    new_balance := GREATEST(0, current_balance - credit_amount);
  END IF;
  
  UPDATE public.user_credits
  SET credits_balance = new_balance, updated_at = now()
  WHERE user_id = target_user_id;
  
  INSERT INTO public.credits_history (user_id, admin_id, action, amount, balance_before, balance_after, reason)
  VALUES (target_user_id, auth.uid(), credit_action, credit_amount, current_balance, new_balance, credit_reason);
  
  result := jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'action', credit_action,
    'amount', credit_amount,
    'balance_before', current_balance,
    'balance_after', new_balance
  );
  
  RETURN result;
END;
$$;
```

---

## 9. INDICES

```text
-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

CREATE INDEX IF NOT EXISTS idx_leads_database_cpf ON public.leads_database(cpf);
CREATE INDEX IF NOT EXISTS idx_leads_database_phone ON public.leads_database(phone);
CREATE INDEX IF NOT EXISTS idx_leads_database_convenio ON public.leads_database(convenio);
CREATE INDEX IF NOT EXISTS idx_leads_database_is_available ON public.leads_database(is_available);

CREATE INDEX IF NOT EXISTS idx_leads_distribution_user_id ON public.leads_distribution(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_distribution_lead_id ON public.leads_distribution(lead_id);

CREATE INDEX IF NOT EXISTS idx_leads_company_id ON public.leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);

CREATE INDEX IF NOT EXISTS idx_televendas_user_id ON public.televendas(user_id);
CREATE INDEX IF NOT EXISTS idx_televendas_company_id ON public.televendas(company_id);
CREATE INDEX IF NOT EXISTS idx_televendas_status ON public.televendas(status);
CREATE INDEX IF NOT EXISTS idx_televendas_cpf ON public.televendas(cpf);

CREATE INDEX IF NOT EXISTS idx_activate_leads_telefone ON public.activate_leads(telefone);
CREATE INDEX IF NOT EXISTS idx_activate_leads_status ON public.activate_leads(status);
CREATE INDEX IF NOT EXISTS idx_activate_leads_company_id ON public.activate_leads(company_id);

CREATE INDEX IF NOT EXISTS idx_commissions_user_id ON public.commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON public.commissions(status);

CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON public.user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company_id ON public.user_companies(company_id);

CREATE INDEX IF NOT EXISTS idx_leads_blacklist_expires_at ON public.leads_blacklist(expires_at);
CREATE INDEX IF NOT EXISTS idx_activate_leads_blacklist_expires_at ON public.activate_leads_blacklist(expires_at);

CREATE INDEX IF NOT EXISTS idx_baseoff_cpf ON public.baseoff(cpf);
CREATE INDEX IF NOT EXISTS idx_baseoff_banco ON public.baseoff(banco);
CREATE INDEX IF NOT EXISTS idx_baseoff_clients_cpf ON public.baseoff_clients(cpf);
```

---

## 10. VIEWS

```text
-- View de resumo diario de leads
CREATE OR REPLACE VIEW public.daily_lead_requests AS
SELECT 
  DATE(l.created_at) as request_date,
  l.requested_by,
  p.name as user_name,
  p.email as user_email,
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE l.status = 'new_lead') as leads_novos,
  COUNT(*) FILTER (WHERE l.status = 'in_progress') as em_andamento,
  COUNT(*) FILTER (WHERE l.status = 'closed') as clientes_fechados,
  COUNT(*) FILTER (WHERE l.status = 'refused') as recusados
FROM public.leads l
LEFT JOIN public.profiles p ON l.requested_by = p.id
GROUP BY DATE(l.created_at), l.requested_by, p.name, p.email;
```

---

## 11. CRON JOBS (pg_cron)

```text
-- Job para liberar leads expirados do blacklist diariamente
SELECT cron.schedule(
  'release-blacklisted-leads-daily',
  '0 6 * * *',
  $$ SELECT public.release_expired_blacklisted_leads(); $$
);
```

---

## 12. INSTRUCOES DE EXECUCAO

### Ordem de Execucao:

1. **Extensoes** - Criar extensoes necessarias
2. **Enums** - Criar todos os tipos enumerados
3. **Funcoes Utilitarias** - Criar funcoes base
4. **Tabelas** - Criar tabelas na ordem de dependencia
5. **Indices** - Criar indices para performance
6. **Triggers** - Criar triggers
7. **Policies RLS** - Criar policies de seguranca
8. **Funcoes RPC** - Criar funcoes de negocio
9. **Views** - Criar views
10. **Cron Jobs** - Agendar jobs periodicos
11. **Dados** - Importar dados do backup

### Importar Dados:

```text
pg_restore -h SEU_HOST_SELF_HOSTED \
  -U postgres \
  -d postgres \
  --data-only \
  credtz_data_backup.dump
```

### Atualizar Conexao no Frontend:

Editar `src/integrations/supabase/client.ts`:
```text
const SUPABASE_URL = "https://seu-self-hosted.dominio.com";
const SUPABASE_ANON_KEY = "sua-nova-anon-key";
```

---

## SECAO TECNICA: OBSERVACOES IMPORTANTES

1. **Auth Users**: A tabela `auth.users` e gerenciada pelo Supabase Auth. Os usuarios precisam ser recriados ou migrados separadamente usando a API do Supabase.

2. **Storage**: Arquivos no Storage precisam ser migrados manualmente ou via API.

3. **Edge Functions**: Copiar a pasta `supabase/functions` para o novo projeto.

4. **Secrets**: Reconfigurar todos os secrets no novo ambiente.

5. **RLS**: Todas as policies usam `auth.uid()` que depende do Supabase Auth estar configurado.

6. **Backup Regular**: Configure backups automaticos no self-hosted.

