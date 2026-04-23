## Importar base "Governo" em Leads Premium + filtros avançados

Adicionar suporte ao novo cabeçalho de base de governo (Bahia) e habilitar filtros por **banco**, **valor de parcela** e **margem disponível** no fluxo de Solicitar Leads.

### 1. Banco — novas colunas em `leads_database`

A tabela já tem `banco`, `parcela`, `parcelas_pagas`, `parcelas_em_aberto`. Faltam campos da base de governo:

```sql
ALTER TABLE public.leads_database
  ADD COLUMN IF NOT EXISTS matricula text,
  ADD COLUMN IF NOT EXISTS margem_disponivel numeric,
  ADD COLUMN IF NOT EXISTS margem_total numeric,
  ADD COLUMN IF NOT EXISTS situacao text,
  ADD COLUMN IF NOT EXISTS ade text,
  ADD COLUMN IF NOT EXISTS servico_servidor text,
  ADD COLUMN IF NOT EXISTS tipo_servico_servidor text,
  ADD COLUMN IF NOT EXISTS servico_consignataria text,
  ADD COLUMN IF NOT EXISTS deferimento date,
  ADD COLUMN IF NOT EXISTS quitacao date,
  ADD COLUMN IF NOT EXISTS ultimo_desconto date,
  ADD COLUMN IF NOT EXISTS ultima_parcela date,
  ADD COLUMN IF NOT EXISTS origem_base text DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_leads_database_banco ON public.leads_database(banco) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_leads_database_margem ON public.leads_database(margem_disponivel) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_leads_database_parcela ON public.leads_database(parcela) WHERE is_available = true;
```

> Telefone permanece NOT NULL — bases de governo podem não trazer telefone; nesses casos o lead será salvo com `phone=''` e marcado `is_available=false` (não distribuível) para não quebrar fluxos existentes.

### 2. Importação — novo formato "Base Governo"

**`src/components/ImportBase.tsx`**

- Adicionar **seletor de tipo de base** no topo: `Padrão (Nome/Convênio/Telefone)` × `Governo (servidor público)`.
- Quando o usuário escolher **Governo**:
  - Decodificar arquivo testando UTF-8 e Windows-1252 (CSV vem com `MatrÃ­cula`); escolher a versão sem caracteres `Ã`.
  - Mapear colunas:

    | CSV | Coluna BD |
    |---|---|
    | CPF | `cpf` |
    | Servidor | `name` |
    | Matrícula | `matricula` |
    | Tipo Serviço (Servidor) | `tipo_servico_servidor` |
    | Serviço (Servidor) | `servico_servidor` |
    | Margem Disponível (R$) | `margem_disponivel` |
    | Margem Total (R$) | `margem_total` |
    | Consignatária | `banco` |
    | Situação | `situacao` |
    | ADE | `ade` |
    | Serviço (Consignatária) | `servico_consignataria` |
    | Prestações | `parcelas_em_aberto` |
    | Pagas | `parcelas_pagas` |
    | Valor | `parcela` |
    | Deferimento / Quitação / Ultimo Desconto / Ultima Parcela | datas correspondentes |

  - Parser numérico BR (`1.234,56` → `1234.56`); parser de data BR (`dd/mm/aaaa`).
  - Campos derivados: `convenio = 'Governo BA'`, `telefone = ''` quando ausente, `origem_base = 'governo_ba'`.
  - Validação: linha válida exige `cpf` (11 dígitos) e `name`.
- Preview adapta colunas exibidas (CPF, Servidor, Banco, Margem, Parcela).

### 3. RPC — novos filtros em `request_leads_with_credits`

Drop + recreate da função adicionando 3 parâmetros opcionais (compat preservada — todos os callers atuais usam invocação nominal):

```sql
request_leads_with_credits(
  leads_requested int default 10,
  convenio_filter text default null,
  banco_filter text default null,
  ddd_filter text[] default null,
  tag_filter text[] default null,
  produto_filter text default null,
  parcela_min numeric default null,   -- NOVO
  parcela_max numeric default null,   -- NOVO
  margem_min numeric default null     -- NOVO
)
```

WHERE adiciona:
```sql
AND (banco_filter IS NULL OR banco = banco_filter)
AND (parcela_min IS NULL OR parcela >= parcela_min)
AND (parcela_max IS NULL OR parcela <= parcela_max)
AND (margem_min IS NULL OR margem_disponivel >= margem_min)
```

Retorno passa a incluir `banco`, `parcela`, `margem_disponivel` para exibir nos cards.

Nova RPC auxiliar:
```sql
get_available_bancos() RETURNS TABLE(banco text, available_count bigint)
```

### 4. Wizard de Solicitar Leads — filtros avançados

**`StepPerfil.tsx`** ganha 3 controles novos:
- Select **Banco / Consignatária** (alimentado por `get_available_bancos`, com contagem).
- Slider duplo **Faixa de parcela** (R$ 0 → R$ 5.000).
- Input numérico **Margem mínima** (R$).

**`RequestLeadsWizard/types.ts`**:
```ts
export interface LeadRequestData {
  // ...existentes
  banco: string | null;
  parcelaMin: number | null;
  parcelaMax: number | null;
  margemMin: number | null;
}
```

### 5. Hooks que chamam o RPC

Repassar os novos filtros:
- `src/modules/leads-premium/hooks/useLeadsPremium.ts`
- `src/components/LeadsManagement.tsx` (passa `null`)
- `src/modules/autolead/hooks/useAutoLead.ts` (passa `null`)
- `src/modules/sms/views/CampaignsView.tsx` (passa `null`)

### 6. Card do lead — exibir novas infos

`LeadCard` mostra chips quando preenchidos:
- 🏦 `banco`
- 💰 Parcela `R$ 234,50`
- 📊 Margem `R$ 1.200,00`

### Arquivos afetados

- **Migration**: colunas + índices + recreate `request_leads_with_credits` + nova `get_available_bancos`.
- **Frontend**: `ImportBase.tsx`, `RequestLeadsWizard/types.ts`, `RequestLeadsWizard/StepPerfil.tsx`, `useLeadsPremium.ts`, `LeadsManagement.tsx`, `autolead/hooks/useAutoLead.ts`, `sms/views/CampaignsView.tsx`, e o card de lead em Leads Premium.

### Resultado

- Importação direta do CSV de Governo BA (mesmo com encoding latin-1).
- Solicitar Leads ganha filtros de **banco**, **faixa de parcela** e **margem mínima**.
- Compatibilidade total com bases existentes (Padrão) e callers atuais do RPC.