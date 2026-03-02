

## Auditoria Completa: Isolamento por Empresa para Gestores

### Diagnostico Geral

Apos analise detalhada de todos os modulos, identifiquei que varios componentes nao possuem filtro de empresa para gestores. O padrao correto ja existe em alguns modulos (ActivateLeads, MyClientsKanban, TelevendasModule, Dashboard, Commissions), mas esta ausente em outros criticos.

### Modulos com Filtro de Empresa CORRETO (nao precisam de alteracao)

| Modulo | Mecanismo |
|---|---|
| ActivateLeads.tsx | Filtra por `assigned_to` usando IDs de usuarios da empresa |
| MyClientsKanban.tsx | Filtra por `company_id` nas propostas |
| TelevendasModule.tsx | Filtra por `company_id` |
| Dashboard.tsx | Filtra atividades por empresa |
| Commissions.tsx | Filtra por `company_id` |
| SalesRanking.tsx | Filtra por `company_id` |
| SMS TelevendasSmsView | Filtra por `company_id` |
| SMS AutomationView | Filtra por `company_id` |

### Modulos com PROBLEMAS (precisam de correcao)

---

#### 1. Leads Premium (`useLeadsPremium.ts`) - CRITICO

**Problema:** Gestores so veem seus proprios leads. Nao veem leads dos colaboradores da empresa.

Codigo atual (linhas 73-75):
```text
if (!isAdmin) {
  query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
}
```

**Correcao:** Adicionar verificacao de gestor e filtrar por IDs de usuarios da empresa:
- Buscar se o usuario e gestor via `user_companies`
- Se gestor, buscar todos os `user_ids` da empresa
- Filtrar leads por `assigned_to` ou `created_by` pertencentes a empresa
- Tambem corrigir `fetchUsers` (linha 92-105) para mostrar apenas usuarios da empresa

---

#### 2. SMS - useSmsData.ts (Campanhas, Listas, Historico)

**Problema:** Os dados de campanhas (`sms_campaigns`), listas de contatos (`sms_contact_lists`) e historico (`sms_history`) sao carregados sem filtro de empresa. Gestores veem campanhas e listas criadas por qualquer usuario.

**Correcao:**
- Filtrar `sms_campaigns` por `created_by` usando IDs dos usuarios da empresa
- Filtrar `sms_contact_lists` por `created_by` usando IDs dos usuarios da empresa
- `sms_history` ja tem filtro parcial por `company_id`, mas deve usar IDs de usuarios tambem (pois `company_id` pode ser NULL)

---

#### 3. SMS - CampaignsView.tsx (Gravar company_id)

**Problema:** Ao criar campanhas e listas de contatos importadas, o campo `company_id` fica NULL. Isso impede filtragem futura.

**Correcao:**
- Ao criar campanha (linha 184): adicionar `company_id: companyId`
- Ao criar lista de contatos importada (linha 157-158): adicionar `company_id: companyId`

---

#### 4. SMS - ContactsView.tsx (Gravar company_id)

**Problema:** Ao criar listas de contatos manualmente, `company_id` nao e gravado.

**Correcao:** Adicionar `company_id` ao inserir novas listas.

---

### Alteracoes por Arquivo

| Arquivo | Tipo de Alteracao |
|---|---|
| `src/modules/leads-premium/hooks/useLeadsPremium.ts` | Adicionar logica de gestor em fetchLeads e fetchUsers |
| `src/modules/sms/hooks/useSmsData.ts` | Filtrar campanhas, listas e historico por empresa |
| `src/modules/sms/views/CampaignsView.tsx` | Gravar company_id ao criar campanha e lista |
| `src/modules/sms/views/ContactsView.tsx` | Gravar company_id ao criar lista de contatos |

### Detalhamento Tecnico

#### useLeadsPremium.ts

```text
// Adicionar estado para gestor
const [isGestor, setIsGestor] = useState(false);
const [companyUserIds, setCompanyUserIds] = useState<string[]>([]);

// No useEffect inicial, verificar role na user_companies
// Se gestor, buscar todos user_ids da empresa

// Em fetchLeads:
ANTES:
  if (!isAdmin) {
    query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
  }

DEPOIS:
  if (!isAdmin) {
    if (isGestor && companyUserIds.length > 0) {
      query = query.or(`assigned_to.in.(${companyUserIds.join(',')}),created_by.in.(${companyUserIds.join(',')})`);
    } else {
      query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
    }
  }

// Em fetchUsers:
ANTES: Busca TODOS os usuarios
DEPOIS: Se gestor, buscar apenas usuarios da empresa via user_companies
```

#### useSmsData.ts

```text
// Buscar companyUserIds no inicio (mesmo padrao de useUserCompany + user lookup)

// fetchCampaigns:
  if (!isAdmin && companyUserIds.length > 0) 
    query = query.in("created_by", companyUserIds)

// fetchContactLists:
  if (!isAdmin && companyUserIds.length > 0) 
    query = query.in("created_by", companyUserIds)

// fetchHistory:
  if (!isAdmin && companyUserIds.length > 0) 
    query = query.in("sent_by", companyUserIds)
```

#### CampaignsView.tsx e ContactsView.tsx

```text
// Ao inserir campanha/lista, incluir company_id:
  { ..., company_id: companyId }
```

### Resultado Esperado

- Gestores da JS CRED (e qualquer outra empresa) verao apenas leads, campanhas, listas e historico dos usuarios de sua propria empresa
- Administradores mantem visao global
- Colaboradores continuam vendo apenas seus proprios dados
- Novos registros (campanhas, listas) serao criados com `company_id` preenchido para filtragem futura

