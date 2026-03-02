

## Correcao: Isolamento por Empresa na Importacao de Leads para Campanhas SMS

### Problema

Quando um gestor de uma empresa (ex: JS Cred) cria uma campanha SMS e importa leads dos modulos Activate, Leads Premium ou Televendas, o sistema puxa leads de **todas as empresas**, violando o isolamento de dados. Alem disso, o filtro por empresa nao esta sendo aplicado porque o componente `CampaignsView` nao possui acesso ao `companyId` do usuario.

### Causa Raiz

No arquivo `src/modules/sms/views/CampaignsView.tsx`, a funcao `handleImportLeads` faz queries diretas nas tabelas sem filtrar por `company_id`:

```text
// Sem filtro de empresa:
supabase.from("activate_leads").select("id, nome, telefone, status")
supabase.from("leads").select("id, name, phone, status")
supabase.from("televendas").select("id, nome, telefone, status")
```

### Solucao

#### 1. Adicionar hook `useUserCompany` ao CampaignsView

Importar e utilizar o hook `useUserCompany()` que ja existe no projeto e ja e usado pelo `AutomationView`.

#### 2. Filtrar queries por `company_id`

Para cada modulo de origem, adicionar o filtro `.eq("company_id", companyId)` quando o usuario nao for admin:

```text
activate_leads:
  ANTES: supabase.from("activate_leads").select("id, nome, telefone, status")
  DEPOIS: + .eq("company_id", companyId)  (se nao for admin)

leads (Leads Premium):
  ANTES: supabase.from("leads").select("id, name, phone, status")
  DEPOIS: + .eq("company_id", companyId)  (se nao for admin)

televendas:
  ANTES: supabase.from("televendas").select("id, nome, telefone, status")
  DEPOIS: + .eq("company_id", companyId)  (se nao for admin)
```

Admins continuam vendo leads de todas as empresas (comportamento existente em outros modulos).

#### 3. Bloquear importacao se companyId nao estiver disponivel

Se o usuario nao for admin e o `companyId` ainda nao carregou, exibir mensagem informando que a empresa nao foi identificada, impedindo a importacao de dados de empresas incorretas.

### Arquivo a Modificar

| Arquivo | Alteracao |
|---|---|
| `src/modules/sms/views/CampaignsView.tsx` | Importar `useUserCompany`, aplicar filtro `company_id` nas 3 queries de importacao |

### Resultado Esperado

- Gestores verao apenas os leads da propria empresa ao importar para campanhas SMS
- Admins continuam com visao global
- Nenhuma alteracao no banco de dados e necessaria (as colunas `company_id` ja existem nas 3 tabelas)

