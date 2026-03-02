
## Correcao: Isolamento por Empresa quando company_id e NULL

### Problema Raiz

As tabelas `activate_leads` e `leads` (Leads Premium) possuem `company_id = NULL` em **100% dos registros**. A identificacao da empresa e feita indiretamente pelo usuario atribuido (`assigned_to`, `created_by`, `requested_by`), que esta vinculado a uma empresa via `user_companies`.

O filtro atual `.eq("company_id", companyId)` nao funciona porque:
- Quando aplicado: retorna 0 resultados (NULL != companyId)
- Quando nao aplicado: retorna TODOS os registros de todas as empresas

### Dados Confirmados (JS Cred)

| Modulo | Total | JS Cred | em_andamento JS Cred |
|---|---|---|---|
| activate_leads | 224 | 10 | **2** |
| leads (premium) | 2464 | 5 | 0 |
| televendas | 624 | tem company_id | funciona |
| propostas | 655 | tem company_id | funciona |

### Solucao

Para os modulos onde `company_id` e NULL, filtrar pelos IDs de usuarios da empresa. A logica sera:

1. Quando o usuario nao for admin, buscar os `user_ids` da empresa do gestor
2. Filtrar leads usando `.in("assigned_to", companyUserIds)` ou `.in("created_by", companyUserIds)` como alternativa ao filtro por `company_id`
3. Manter o filtro por `company_id` para `televendas` e `propostas` que ja possuem esse campo preenchido

### Alteracoes

#### 1. CampaignsView.tsx - Importacao de leads para campanhas

```text
ANTES:
  if (!isAdmin && companyId) query = query.eq("company_id", companyId)

DEPOIS (activate_leads):
  if (!isAdmin && companyUserIds.length) query = query.in("assigned_to", companyUserIds)

DEPOIS (leads_premium):
  if (!isAdmin && companyUserIds.length) query = query.in("assigned_to", companyUserIds)

DEPOIS (televendas - ja funciona, manter):
  if (!isAdmin && companyId) query = query.eq("company_id", companyId)
```

Adicionar busca de `companyUserIds` no inicio de `handleImportLeads`:
```text
const { data: companyUsers } = await supabase
  .from("user_companies")
  .select("user_id")
  .eq("company_id", companyId)
  .eq("is_active", true);
const companyUserIds = (companyUsers || []).map(u => u.user_id);
```

#### 2. RemarketingSmsView.tsx - Sincronizacao de remarketing

Mesma logica: buscar `companyUserIds` no inicio de `handleSync` e usar `.in("assigned_to", companyUserIds)` para activate_leads e leads premium. Manter `.eq("company_id", companyId)` para propostas.

Tambem aplicar no Sync Activate Leads: usar `.or("assigned_to.in.(ids),created_by.in.(ids)")` para cobrir ambos os campos.

### Arquivos a Modificar

| Arquivo | Alteracao |
|---|---|
| `src/modules/sms/views/CampaignsView.tsx` | Buscar user_ids da empresa, filtrar activate_leads e leads por assigned_to |
| `src/modules/sms/views/RemarketingSmsView.tsx` | Mesma logica no handleSync para activate_leads e leads premium |

### Resultado Esperado

- JS Cred vera apenas seus 2 leads "em_andamento" do Activate Leads (nao 224)
- Sync do Remarketing encontrara os 2 leads corretamente
- Televendas e Meus Clientes continuam funcionando (ja possuem company_id preenchido)
- Admins mantem visao global sem filtros
