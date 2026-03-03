

## Plano: Corrigir build error + acesso de gestores aos modulos da empresa

### Problema 1: Build error em LeadDetailDrawer.tsx

O arquivo tem codigo duplicado flutuando fora de qualquer funcao (linhas 242-285). Apos `handleSaveCpf` terminar na linha 240, ha um bloco de codigo solto que era o corpo de `handleSimulationRequest` duplicado. Isso causa:
- `TS1128: Declaration or statement expected` na linha 982
- `await can only be used inside an async function` na linha 255

**Correcao:** Remover o bloco duplicado (linhas 242-285) que ja existe como funcao propria mais adiante no arquivo.

---

### Problema 2: Gestores nao veem dados da empresa nos modulos

Varios modulos carregam dados sem filtrar por empresa para gestores:

**a) TimeClock - AdminControl.tsx (linha 48-53):**
`loadUsers()` busca TODOS os profiles do sistema. Gestor deveria ver apenas usuarios da sua empresa.

**Correcao:** Detectar se e gestor, buscar `company_id` do gestor, filtrar usuarios por `user_companies.company_id` e filtrar registros de ponto pela mesma empresa.

**b) TimeClock - ManagerDashboard.tsx (linha 93-97):**
Carrega TODAS as empresas e permite filtrar. Gestor deveria ver apenas sua propria empresa e nao ter seletor de empresa.

**Correcao:** Detectar se e gestor, carregar apenas a empresa do gestor, forcar `selectedCompanyId` para essa empresa.

**c) ClientDocuments.tsx (linha 135-141):**
Busca todos os documentos sem filtro de empresa. A RLS ja filtra por `company_id`, porem muitos documentos podem ter `company_id = NULL` (inseridos antes da coluna existir), fazendo com que gestores nao vejam nada.

**Correcao:** Para gestores, buscar apenas documentos onde `company_id` pertence a sua empresa OU `uploaded_by` e um usuario da empresa.

**d) Collaborative/index.tsx:**
Ja funciona para todos autenticados, sem problema de acesso.

---

### Problema 3: RLS do `client_documents` - `is_company_gestor` com argumentos invertidos

Na politica de DELETE (linha 196 da migracao):
```sql
public.is_company_gestor(company_id, auth.uid())
```
Mas a funcao espera `(_user_id uuid, _company_id uuid)` - os argumentos estao invertidos. Isso impede gestores de deletar documentos.

**Correcao via migracao SQL:** Recriar a politica com argumentos na ordem correta.

---

### Arquivos a modificar

| Arquivo | Mudanca |
|---|---|
| `src/modules/leads-premium/components/LeadDetailDrawer.tsx` | Remover bloco duplicado (linhas 242-285) |
| `src/components/TimeClock/AdminControl.tsx` | Filtrar usuarios e registros por empresa do gestor |
| `src/components/TimeClock/ManagerDashboard.tsx` | Gestor ve apenas sua empresa, sem seletor global |
| `src/components/ClientDocuments.tsx` | Filtrar documentos por empresa do gestor |
| Migracao SQL | Corrigir `is_company_gestor` args na politica DELETE de `client_documents` |

### Sequencia

1. Corrigir build error em LeadDetailDrawer (remover duplicata)
2. Migracao SQL para corrigir RLS de client_documents
3. Adicionar logica de deteccao gestor + filtro por empresa em AdminControl
4. Adicionar filtro por empresa do gestor em ManagerDashboard
5. Adicionar filtro por empresa do gestor em ClientDocuments

