## Plan: Módulo "Leads Agibank"

Replicar a arquitetura do módulo Leads Premium criando um novo módulo independente para leads do Agibank, com sistema de créditos por abertura, importação em lote, blacklist automática e ações de WhatsApp (API + link).

---

### 1. Banco de Dados (migração Supabase)

**Tabelas novas:**

- `agibank_leads`
  - `id`, `created_at`, `updated_at`
  - `agent_id` (uuid → auth.users)
  - `company_id` (uuid → companies) — necessário para escopo do gestor (padrão do projeto)
  - `name`, `phone` (text, apenas dígitos), `document` (cpf)
  - `status` (enum): `novo | em_andamento | nao_e_whatsapp | nao_e_cliente | sem_interesse | cliente_fechado | agendado`
  - `scheduled_at` (timestamptz, null)
  - `credits_cost` (int, default 1)
  - `first_opened_at` (timestamptz, null) — controla se já foi cobrado
  - `notes` (text)
  - `list_id` (uuid → agibank_lead_lists, null)

- `agibank_lead_lists`
  - `id`, `created_at`, `uploaded_by`, `company_id`
  - `file_name`, `total_rows`, `imported_rows`, `skipped_duplicates`, `skipped_blacklist`

- `agibank_blacklist`
  - `id`, `phone` (unique), `reason`, `added_by`, `created_at`

- `agibank_credits`
  - `id`, `user_id` (unique), `balance` (int, default 0), `updated_at`

**Funções e triggers:**
- `agibank_consume_credit(_lead_id)` — SECURITY DEFINER, marca `first_opened_at`, debita 1 do `agibank_credits.balance` do agente. Retorna `{ success, balance, error }`.
- Trigger em `agibank_leads`: ao mudar `status` para `sem_interesse`, insere `phone` em `agibank_blacklist` (ON CONFLICT DO NOTHING).
- `agibank_add_credits(_user_id, _amount)` — SECURITY DEFINER, gestor/admin.

**RLS (padrão do projeto via `has_role_safe`):**
- Agente: SELECT/UPDATE somente onde `agent_id = auth.uid()`
- Gestor: SELECT/UPDATE no mesmo `company_id`
- Admin: tudo
- INSERT em `agibank_leads`: gestor/admin
- `agibank_blacklist`: SELECT gestor/admin, DELETE admin
- `agibank_credits`: SELECT próprio, UPDATE somente via RPCs

---

### 2. Edge Function

`agibank-import-leads` — recebe array de `{name, phone, document}` + `assignment_mode` (`round_robin` | `manual`) + `agent_ids[]`. Cria registro em `agibank_lead_lists`, valida telefones, filtra duplicatas (já existentes em `agibank_leads`) e blacklist, distribui agentes, retorna contagens.

---

### 3. Frontend — Módulo

Estrutura espelhando `src/modules/leads-premium/`:

```
src/modules/leads-agibank/
  AgibankLeadsModule.tsx          (entry)
  index.ts
  types.ts                         (status enum, labels, cores)
  hooks/
    useAgibankLeads.ts            (list + filter + status update + consume credit)
    useAgibankCredits.ts          (balance do agente logado, top-up para gestor)
    useAgibankImport.ts           (upload CSV/XLSX via edge function)
    useAgibankBlacklist.ts        (admin only)
  components/
    LeadCard.tsx                  (nome, fone mascarado, badge, 2 botões WA)
    LeadDrawer.tsx                (detalhes + notes + status dropdown + datepicker)
    FilterTabs.tsx                (pílulas horizontais)
    ImportModal.tsx               (upload + preview + assignment)
    CreditBadge.tsx               (mostra saldo + modal de bloqueio se 0)
    NoCreditsModal.tsx
    BlacklistManager.tsx          (admin)
  views/
    LeadsListView.tsx             (filtro + grid de cards)
```

Reaproveita:
- Botão verde padrão `bg-green-600` + ícone Send para "API WhatsApp" (memória do projeto)
- `useGestorCompany`, `has_role_safe`, padrões de signed URL N/A aqui
- Edge function existente `send-whatsapp` (Evolution API) — sem criar nova

---

### 4. Integração no Sidebar / Permissões

- Adicionar entrada em `src/config/modules.ts`:
  `{ key: "leads-agibank", defaultLabel: "Leads Agibank", defaultIcon: "TrendingUp", defaultCategory: "captacao" }`
- Adicionar case no `Index.tsx` para renderizar `<AgibankLeadsModule />`
- Permissão dinâmica já será gerenciada pelo módulo `/admin/permissions` automaticamente

---

### 5. Permissão de Importação / Blacklist / Créditos

Controle puramente por role no frontend (`has_role_safe` no backend já bloqueia):
- `ImportModal` visível para `admin | gestor`
- `BlacklistManager` (sub-aba) visível só para `admin`
- Botão "Adicionar créditos" no card do agente (dentro de `UsersManagement` existente) — `admin | gestor`

---

### 6. Comportamento detalhado

- Ao abrir o `LeadDrawer` pela primeira vez (agente): chama `agibank_consume_credit`. Se retornar `success: false` → fecha drawer e abre `NoCreditsModal`.
- Saldo zero: clique em qualquer card abre `NoCreditsModal` (não baixa crédito de novo se já abriu antes — `first_opened_at != null` libera reabertura grátis).
- Mudança de status no dropdown → auto-save + toast.
- Status `agendado` mostra `DatePicker` (shadcn) inline; `scheduled_at` obrigatório.
- Status `sem_interesse` → trigger adiciona à blacklist + toast.
- Telefone mascarado: `(••) •••••-1234`.
- Botão "WhatsApp link" → `window.open('https://wa.me/55' + phone)`.
- Botão "API WhatsApp" → chama edge function `send-whatsapp` com template padrão (mensagem editável em modal rápido).

---

### 7. Validação técnica

- Zod schema para upload (name string, phone 10–11 dígitos, document 11 dígitos)
- CSV parser: usar `papaparse` (já presente) ou parser inline
- XLSX: `xlsx` (verificar se já existe no projeto; se não, adicionar)

---

### Ordem de execução

1. Migração Supabase (tabelas + RLS + funções + trigger)
2. Edge function `agibank-import-leads`
3. Tipos + hooks
4. Componentes (LeadCard, FilterTabs, CreditBadge, LeadDrawer, ImportModal, NoCreditsModal, BlacklistManager)
5. View principal + entry module
6. Registrar no `config/modules.ts` + `Index.tsx`
7. Top-up de créditos em `UsersManagement`

Aprovação necessária antes da migração (passo 1).