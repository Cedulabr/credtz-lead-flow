

## Plano: Correcao Import SMS + Painel de Logs Admin

### Parte 1: Correcao da Importacao de Leads para Gestores

#### Problema Identificado

Apos analise detalhada, identifiquei dois problemas distintos:

**1. RLS da tabela `leads` bloqueia acesso do gestor aos leads de colaboradores**

A politica SELECT atual da tabela `leads` verifica:
```text
is_global_admin(auth.uid()) 
OR company_id IN (get_user_company_ids(auth.uid()))   -- company_id e NULL!
OR auth.uid() = assigned_to                           -- so ve os proprios
OR auth.uid() = created_by                            -- so ve os proprios
```

Como `company_id` e NULL em todos os registros da tabela `leads`, o gestor so consegue ver os leads onde ELE e o `assigned_to` ou `created_by`. Nao ve leads dos colaboradores.

**2. Potencial race condition no carregamento de `companyUserIds`**

Se o gestor clica "Importar" antes do hook `useUserCompany` terminar de carregar, o filtro `.or()` nao e aplicado corretamente.

#### Solucao

**1A. Atualizar RLS da tabela `leads`** - Criar uma funcao `is_company_colleague` que verifica se o lead pertence a um usuario da mesma empresa do gestor. Atualizar a politica SELECT para incluir essa verificacao.

Nova politica SELECT para `leads`:
```text
is_global_admin(auth.uid())
OR company_id IN (get_user_company_ids(auth.uid()))
OR auth.uid() = assigned_to
OR auth.uid() = created_by
OR (
  is_gestor_or_admin(auth.uid()) 
  AND (
    user_in_same_company(assigned_to)
    OR user_in_same_company(requested_by)
  )
)
```

**1B. Atualizar RLS da tabela `activate_leads`** - A politica "Users can view their leads or all if admin/gestor" e muito permissiva (permite qualquer gestor ver TODOS os activate_leads de TODAS as empresas). Corrigir para filtrar por empresa.

**1C. Melhorar tratamento de erro no CampaignsView** - Adicionar logs detalhados e bloquear o botao de importar enquanto companyId nao carregou.

#### Arquivos a Modificar (Parte 1)

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | Atualizar RLS de `leads` e `activate_leads` para gestores |
| `src/modules/sms/views/CampaignsView.tsx` | Melhorar tratamento de erro e logging |

---

### Parte 2: Painel de Activity Logs no Admin

#### Objetivo

Criar um modulo "Logs" no painel admin que mostra em tempo real todas as acoes dos usuarios no sistema: login, criacao de leads, importacoes, alteracoes de status, etc.

#### Nova Tabela: `system_activity_logs`

```text
Colunas:
- id (uuid, PK)
- user_id (uuid, FK profiles)
- user_name (text) -- cache do nome para consulta rapida
- user_email (text)
- action (text) -- ex: "login", "create_lead", "import_leads", "update_status"
- module (text) -- ex: "auth", "activate_leads", "leads_premium", "sms", "televendas"
- description (text) -- descricao legivel da acao
- metadata (jsonb) -- detalhes extras (IP, user agent, dados alterados)
- created_at (timestamptz)
```

Indexes: `user_id`, `action`, `module`, `created_at DESC`

#### Nova Interface: AdminLogs

- Tabela com busca por usuario, modulo e periodo
- Filtros por tipo de acao (login, criacao, atualizacao, exclusao, importacao)
- Filtros por modulo (Auth, Leads Premium, Activate, Televendas, SMS, etc.)
- Badge de cores por tipo de acao
- Paginacao com scroll infinito
- Botao de atualizar em tempo real
- Export CSV dos logs filtrados

#### Integracao com AdminLayout

- Adicionar novo modulo `logs` no type `AdminModule`
- Adicionar icone `ScrollText` na barra de navegacao
- Renderizar `AdminLogs` no switch de modulos

#### Instrumentacao de Logs

Criar hook `useActivityLogger` que registra acoes automaticamente. Instrumentar nos seguintes pontos:

1. **Login/Logout** - AuthContext
2. **Import de leads** - CampaignsView, RemarketingSmsView
3. **Criacao de campanha SMS** - CampaignsView
4. **Alteracao de status de lead** - useLeadsPremium, ActivateLeads
5. **Criacao de proposta** - TelevendasModule

#### Arquivos a Criar/Modificar (Parte 2)

| Arquivo | Tipo | Alteracao |
|---|---|---|
| Migracao SQL | Criar | Tabela `system_activity_logs` + indexes + RLS |
| `src/hooks/useActivityLogger.ts` | Criar | Hook para registrar logs |
| `src/components/admin/AdminLogs.tsx` | Criar | Componente do painel de logs |
| `src/components/admin/AdminLayout.tsx` | Modificar | Adicionar modulo "Logs" |
| `src/components/admin/index.tsx` | Modificar | Importar e renderizar AdminLogs |
| `src/contexts/AuthContext.tsx` | Modificar | Instrumentar login/logout |
| `src/modules/sms/views/CampaignsView.tsx` | Modificar | Log de importacao e criacao de campanha |

### Resultado Esperado

1. Gestores conseguem importar leads de activate_leads e leads_premium no SMS
2. RLS corretamente limita gestores a dados da propria empresa
3. Admin tem visao completa de todas as acoes do sistema com filtros e busca
4. Logs registram automaticamente as principais acoes dos usuarios

